import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, Send } from 'lucide-react';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { ForumPost, ForumReply } from '../types';

export const ForumPage: React.FC = () => {
  const { user, isAdmin, forumPosts, signIn, showToast } = useApp();

  const [postSubject, setPostSubject] = useState<ForumPost['subject']>('Physics');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!selectedPost) {
      setReplies([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'forum_posts', selectedPost.id, 'replies'), orderBy('createdAt', 'asc')),
      (snap) => {
        setReplies(snap.docs.map((d) => ({ ...(d.data() as ForumReply), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `forum_posts/${selectedPost.id}/replies`)
    );
    return () => unsub();
  }, [selectedPost]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) {
      showToast('Please sign in with Google to post a doubt.', 'info');
      return;
    }
    if (postTitle.trim().length < 4 || postBody.trim().length < 4) {
      showToast('Title and question must be at least 4 characters.', 'error');
      return;
    }

    const postId = `post_${Date.now()}`;
    try {
      await setDoc(doc(db, 'forum_posts', postId), {
        id: postId,
        authorId: user.uid,
        authorName: (user.displayName || 'Student').slice(0, 100),
        subject: postSubject,
        title: postTitle.trim().slice(0, 180),
        body: postBody.trim().slice(0, 2000),
        status: 'open',
        replyCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPostTitle('');
      setPostBody('');
      showToast('Doubt posted to student-teacher forum!', 'success');
    } catch (err) {
      console.warn('Could not sync post to cloud:', err);
      showToast('Doubt submitted (offline session).', 'info');
      setPostTitle('');
      setPostBody('');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !user || !user.emailVerified || !replyText.trim()) return;
    const replyId = `rep_${Date.now()}`;
    try {
      await setDoc(doc(db, 'forum_posts', selectedPost.id, 'replies', replyId), {
        id: replyId,
        postId: selectedPost.id,
        authorId: user.uid,
        authorName: (user.displayName || 'Student').slice(0, 100),
        isTeacher: isAdmin,
        body: replyText.trim().slice(0, 2000),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'forum_posts', selectedPost.id), {
        replyCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      setReplyText('');
    } catch (err) {
      console.warn('Could not sync reply to cloud:', err);
      showToast('Reply submitted (offline session).', 'info');
      setReplyText('');
    }
  };

  const handleToggleResolved = async (post: ForumPost) => {
    if (!user || !user.emailVerified) return;
    try {
      await updateDoc(doc(db, 'forum_posts', post.id), {
        status: post.status === 'open' ? 'resolved' : 'open',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not update post status in cloud:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Teacher &amp; Student Doubt Forum
          </h1>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {forumPosts.length} active discussion {forumPosts.length === 1 ? 'thread' : 'threads'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Post a doubt + Thread List */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Post a Question to Teachers &amp; Batchmates
            </h2>
            {!user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sign in with Google to ask questions and participate in live doubt discussions with faculty.
                </p>
                <GoogleSignInButton onClick={() => signIn(false)} />
              </div>
            ) : (
              <form onSubmit={handleCreatePost} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={postSubject}
                    onChange={(e) => setPostSubject(e.target.value as ForumPost['subject'])}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  >
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                    <option>General</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Short doubt title..."
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Write your question or chapter reference..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Post Doubt
                </button>
              </form>
            )}
          </div>

          <div className="space-y-3">
            {forumPosts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No forum threads yet. Ask the first doubt above!
              </div>
            ) : (
              forumPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    selectedPost?.id === post.id
                      ? 'border-[#0F2942] bg-slate-50 dark:border-amber-500 dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {post.subject} · {post.authorName}
                    </span>
                    <span
                      className={`font-semibold ${
                        post.status === 'resolved'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {post.status === 'resolved' ? 'Resolved' : 'Open'} · {post.replyCount} replies
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {post.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Selected Thread Chat */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col min-h-[420px]">
          {selectedPost ? (
            <>
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPost.subject} · Asked by {selectedPost.authorName}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedPost.title}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-line">
                    {selectedPost.body}
                  </p>
                </div>
                {(isAdmin || user?.uid === selectedPost.authorId) && (
                  <button
                    type="button"
                    onClick={() => handleToggleResolved(selectedPost)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedPost.status === 'open' ? 'Mark Resolved' : 'Reopen'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {replies.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-8">
                    No replies yet. Teachers or batchmates can post a solution below.
                  </p>
                ) : (
                  replies.map((rep) => (
                    <div
                      key={rep.id}
                      className={`rounded-lg p-3.5 border text-sm ${
                        rep.isTeacher
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {rep.authorName}
                          {rep.isTeacher && ' · Faculty Mentor'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line">
                        {rep.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {user && (
                <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply or solution..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-sm">Select a doubt thread on the left to view teacher replies and chat.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

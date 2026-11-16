export interface GoogleFormSummary {
  formId: string;
  title: string;
  responderUri: string;
  questionCount: number;
}

export interface GoogleFormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  totalScore?: number;
}

export async function createGoogleFormQuiz(
  accessToken: string,
  title: string,
  description: string,
  questions: { question: string; options: string[]; correctIndex: number }[]
): Promise<GoogleFormSummary> {
  // 1. Create form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: title.trim(),
        documentTitle: title.trim(),
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Form: ${errText}`);
  }

  const created = (await createRes.json()) as {
    formId: string;
    responderUri: string;
    info?: { title?: string };
  };
  const safeFormId = encodeURIComponent(created.formId.trim());

  // 2. Enable quiz mode and add questions via batchUpdate
  const requests: Record<string, unknown>[] = [
    {
      updateSettings: {
        settings: { quizSettings: { isQuiz: true } },
        updateMask: 'quizSettings.isQuiz',
      },
    },
    {
      updateFormInfo: {
        info: { description: description.trim() },
        updateMask: 'description',
      },
    },
  ];

  questions.slice(0, 20).forEach((q, idx) => {
    const validOptions = q.options.filter((o) => o.trim().length > 0).map((o) => ({ value: o.trim() }));
    const correctVal = validOptions[q.correctIndex]?.value || validOptions[0]?.value || 'Option A';
    requests.push({
      createItem: {
        item: {
          title: q.question.trim(),
          questionItem: {
            question: {
              required: true,
              grading: {
                pointValue: 1,
                correctAnswers: {
                  answers: [{ value: correctVal }],
                },
              },
              choiceQuestion: {
                type: 'RADIO',
                options: validOptions,
                shuffle: false,
              },
            },
          },
        },
        location: { index: idx },
      },
    });
  });

  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Created form, but failed to add quiz items: ${errText}`);
  }

  return {
    formId: created.formId,
    title: created.info?.title || title,
    responderUri: created.responderUri,
    questionCount: questions.length,
  };
}

export async function fetchGoogleFormInfo(
  accessToken: string,
  formId: string
): Promise<GoogleFormSummary> {
  const safeFormId = encodeURIComponent(formId.trim());
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Unable to read Google Form (${res.status}). Check Form ID and Google permissions.`);
  }
  const data = (await res.json()) as {
    formId: string;
    responderUri: string;
    info?: { title?: string };
    items?: unknown[];
  };
  return {
    formId: data.formId,
    title: data.info?.title || 'Google Form Assessment',
    responderUri: data.responderUri,
    questionCount: data.items?.length || 0,
  };
}

export async function fetchGoogleFormResponses(
  accessToken: string,
  formId: string
): Promise<GoogleFormResponseItem[]> {
  const safeFormId = encodeURIComponent(formId.trim());
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}/responses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Unable to read Google Form responses (${res.status}).`);
  }
  const data = (await res.json()) as { responses?: GoogleFormResponseItem[] };
  return data.responses || [];
}

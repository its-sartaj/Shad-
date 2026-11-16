import React from 'react';
import { MessageCircle } from 'lucide-react';

export const WhatsAppFloatingButton: React.FC = () => {
  return (
    <a
      href="https://wa.me/919525206317?text=Namaste%20Sir%2C%20I%20am%20a%20student%20looking%20for%20doubt%20support%20and%20batch%20details%20at%20Shad%20Concept%20Classes."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Doubt Support"
      title="WhatsApp Doubt Support"
      className="fixed bottom-4 right-4 z-40 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white shadow-lg transition-transform hover:scale-105 no-print"
    >
      <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
    </a>
  );
};

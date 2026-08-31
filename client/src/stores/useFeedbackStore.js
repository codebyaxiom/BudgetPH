import { create } from 'zustand';

export const useFeedbackStore = create((set) => ({
  errorModal: null, // { title, message, errorDetails, onRetry }

  showErrorModal: ({ title, message, errorDetails = null, onRetry = null }) => {
    set({
      errorModal: {
        title: title || 'May Naganap na Error / System Notice',
        message: message || 'Hindi nakumpleto ang proseso. Mangyaring subukan muli.',
        errorDetails: typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : String(errorDetails || ''),
        onRetry
      }
    });
  },

  closeErrorModal: () => {
    set({ errorModal: null });
  }
}));

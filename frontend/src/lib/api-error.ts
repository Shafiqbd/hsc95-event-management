export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** User-facing Bengali message for an API failure. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return error.message;
      case 401:
        return "লগইন নাম বা পাসওয়ার্ড সঠিক নয়, অথবা সেশনের মেয়াদ শেষ হয়েছে।";
      case 403:
        return error.message || "এই কাজটি করার অনুমতি আপনার নেই।";
      case 404:
        return "তথ্য পাওয়া যায়নি।";
      case 409:
        if (/form number/i.test(error.message)) return "এই ফরম নম্বরে ইতিমধ্যে নিবন্ধন করা হয়েছে।";
        if (/mobile/i.test(error.message)) return "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে নিবন্ধন করা হয়েছে।";
        if (/login/i.test(error.message)) return "This login name is already taken.";
        return error.message;
      case 413:
        return "ছবির আকার অনেক বড়। ২ মেগাবাইটের ছোট ছবি দিন।";
      case 429:
        return "অনেকবার চেষ্টা করা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।";
      case 503:
        return "সেবাটি এই মুহূর্তে পাওয়া যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন বা আয়োজকের সাথে যোগাযোগ করুন।";
      default:
        if (error.status >= 500) return "সার্ভারে একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
        return error.details.length > 0 ? error.details.join(", ") : error.message;
    }
  }
  return "অপ্রত্যাশিত একটি সমস্যা হয়েছে।";
}

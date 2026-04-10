const BLOCKED_KEYWORDS = [
  'spam',
  'scam',
  'phishing',
  'malware',
  'virus',
  'hack',
  'crack',
  'illegal',
  'violence',
  'explicit',
  'nsfw',
  'adult',
];

const MAX_HASHTAGS = 10;
const MAX_CAPTION_LENGTH = 500;

export interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  flaggedWords?: string[];
}

export function moderateContent(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { isAllowed: true };
  }

  const lowerText = text.toLowerCase();
  const flaggedWords: string[] = [];

  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      flaggedWords.push(keyword);
    }
  }

  if (flaggedWords.length > 0) {
    return {
      isAllowed: false,
      reason: 'Content contains prohibited keywords',
      flaggedWords
    };
  }

  return { isAllowed: true };
}

export function moderateCaption(caption: string): ModerationResult {
  if (!caption || caption.trim().length === 0) {
    return { isAllowed: true };
  }

  if (caption.length > MAX_CAPTION_LENGTH) {
    return {
      isAllowed: false,
      reason: `Caption exceeds ${MAX_CAPTION_LENGTH} characters`
    };
  }

  return moderateContent(caption);
}

export function moderateHashtags(hashtags: string[]): ModerationResult {
  if (!hashtags || hashtags.length === 0) {
    return { isAllowed: true };
  }

  if (hashtags.length > MAX_HASHTAGS) {
    return {
      isAllowed: false,
      reason: `Maximum ${MAX_HASHTAGS} hashtags allowed`
    };
  }

  const allHashtags = hashtags.join(' ');
  return moderateContent(allHashtags);
}

export function moderateVideoUpload(
  title: string,
  caption: string,
  hashtags: string[]
): ModerationResult {
  const titleResult = moderateContent(title);
  if (!titleResult.isAllowed) {
    return { ...titleResult, reason: `Title: ${titleResult.reason}` };
  }

  const captionResult = moderateCaption(caption);
  if (!captionResult.isAllowed) {
    return captionResult;
  }

  const hashtagResult = moderateHashtags(hashtags);
  if (!hashtagResult.isAllowed) {
    return hashtagResult;
  }

  return { isAllowed: true };
}

export function reportContent(reason: string): ModerationResult {
  if (!reason || reason.trim().length < 10) {
    return {
      isAllowed: false,
      reason: 'Report reason must be at least 10 characters'
    };
  }

  return { isAllowed: true };
}

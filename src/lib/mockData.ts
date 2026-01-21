export type AIProvider = 'perplexity' | 'gemini' | 'chatgpt' | 'claude';

export interface AIResponse {
  provider: AIProvider;
  response: string | null;
  timestamp: Date | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  timestamp: Date;
  responses: { provider: AIProvider; preview: string }[];
}

export const AI_CONFIG: Record<AIProvider, { name: string; icon: string; tagline: string }> = {
  perplexity: {
    name: 'Perplexity',
    icon: '🔍',
    tagline: 'AI-powered search',
  },
  gemini: {
    name: 'Gemini',
    icon: '✨',
    tagline: 'Google AI',
  },
  chatgpt: {
    name: 'ChatGPT',
    icon: '🤖',
    tagline: 'OpenAI',
  },
  claude: {
    name: 'Claude',
    icon: '🧠',
    tagline: 'Anthropic',
  },
};

export const mockResponses: Record<AIProvider, string[]> = {
  perplexity: [
    "Based on my analysis of multiple sources, here's what I found:\n\nThe topic you're asking about has several key aspects worth exploring. According to recent research and verified sources, the main points are:\n\n1. **Primary Finding**: The data suggests a strong correlation between the variables you mentioned.\n\n2. **Supporting Evidence**: Multiple peer-reviewed studies confirm this pattern.\n\n3. **Practical Implications**: This means you can apply these insights directly to your situation.\n\nSources: Academic journals, industry reports, and expert analyses.",
    "I've searched through the latest information available:\n\nYour question touches on an evolving area. Here's the current consensus:\n\n• The mainstream view supports the conventional approach\n• However, emerging research points to alternative methods\n• Experts recommend considering both perspectives\n\nWould you like me to dive deeper into any specific aspect?",
  ],
  gemini: [
    "Great question! Let me break this down for you:\n\n**Overview**\nThis is a fascinating topic that spans multiple domains. Here's my analysis:\n\n**Key Points**\n→ The fundamental principle is straightforward\n→ Applications range from simple to complex\n→ Best practices have evolved significantly\n\n**My Recommendation**\nStart with the basics and build from there. I can provide more specific guidance if you share your particular context.\n\n*Would you like code examples or visual explanations?*",
    "Here's what I can tell you:\n\n🎯 **Direct Answer**: Yes, this is definitely possible and here's how.\n\n📚 **Background**: The concept originated in the early 2000s and has since become industry standard.\n\n💡 **Pro Tip**: Consider using the latest version for best results - it includes significant improvements.\n\nLet me know if you'd like me to elaborate on any part!",
  ],
  chatgpt: [
    "I'd be happy to help you with that!\n\nTo answer your question comprehensively:\n\n**Short Answer**: The most effective approach depends on your specific requirements, but generally speaking, option A tends to work best for most use cases.\n\n**Detailed Explanation**:\nWhen we look at this problem, there are several factors to consider:\n\n1. **Performance** - This affects how quickly you'll see results\n2. **Scalability** - Important if you plan to grow\n3. **Maintainability** - Long-term considerations matter\n\nHere's a practical example:\n```\nStep 1: Define your goals\nStep 2: Assess your resources\nStep 3: Implement incrementally\n```\n\nWould you like me to provide more specific guidance for your situation?",
    "That's an interesting question! Here's my take:\n\n**The Quick Version**: It depends on context, but here are the key considerations.\n\n**The Detailed Version**:\n\nFirst, let's establish what we're working with. The topic you're asking about has nuances that are often overlooked.\n\n*Common misconceptions:*\n- Many people assume X, but actually Y is more accurate\n- The relationship between these factors is non-linear\n\n*What I recommend:*\nStart with a clear understanding of your constraints, then work backwards from your desired outcome.\n\nFeel free to ask follow-up questions!",
  ],
  claude: [
    "Thank you for your question. Let me provide a thoughtful analysis.\n\n**Understanding the Core Issue**\n\nThis question gets at something fundamental. Rather than giving a surface-level answer, I think it's worth exploring the underlying principles.\n\n**My Perspective**\n\nThere are multiple valid approaches here, and the \"right\" answer often depends on:\n\n• Your specific constraints and requirements\n• The trade-offs you're willing to accept\n• Your long-term goals versus short-term needs\n\n**Practical Guidance**\n\nIf I were in your position, I would:\n1. Start by clearly defining success criteria\n2. Prototype the simplest viable solution\n3. Iterate based on real feedback\n\nI should note that there's some uncertainty here - the field is evolving, and best practices continue to develop. Would you like to discuss any aspect in more depth?",
    "I appreciate you asking this - it's a nuanced topic.\n\n**Key Insight**: The conventional wisdom isn't always correct here. Let me explain why.\n\n**The Standard View**\nMost resources will tell you to follow approach X. This works in many cases, but has limitations.\n\n**A More Nuanced Take**\nWhen we examine this more carefully, we find that:\n\n→ Context matters significantly\n→ Edge cases are more common than typically assumed\n→ There are emerging alternatives worth considering\n\n**My Honest Assessment**\nI'd recommend a hybrid approach that combines the reliability of traditional methods with the flexibility of newer techniques.\n\nWould you like me to elaborate on the specific trade-offs involved?",
  ],
};

export const mockChatHistory: ChatHistoryItem[] = [
  {
    id: '1',
    question: 'What is the best programming language for beginners?',
    timestamp: new Date(Date.now() - 3600000 * 2),
    responses: [
      { provider: 'perplexity', preview: 'Based on my analysis...' },
      { provider: 'gemini', preview: 'Great question! Python...' },
      { provider: 'chatgpt', preview: 'I recommend starting...' },
      { provider: 'claude', preview: 'For beginners, I suggest...' },
    ],
  },
  {
    id: '2',
    question: 'How does machine learning work?',
    timestamp: new Date(Date.now() - 3600000 * 24),
    responses: [
      { provider: 'perplexity', preview: 'Machine learning is...' },
      { provider: 'gemini', preview: 'At its core, ML...' },
      { provider: 'chatgpt', preview: 'Machine learning works by...' },
      { provider: 'claude', preview: 'Let me explain ML...' },
    ],
  },
  {
    id: '3',
    question: 'What are the benefits of TypeScript?',
    timestamp: new Date(Date.now() - 3600000 * 48),
    responses: [
      { provider: 'perplexity', preview: 'TypeScript offers...' },
      { provider: 'gemini', preview: 'The key benefits are...' },
      { provider: 'chatgpt', preview: 'TypeScript provides...' },
      { provider: 'claude', preview: 'There are several advantages...' },
    ],
  },
];

export function getRandomResponse(provider: AIProvider): string {
  const responses = mockResponses[provider];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getRandomDelay(): number {
  // Random delay between 500ms and 2500ms to simulate different response times
  return 500 + Math.random() * 2000;
}

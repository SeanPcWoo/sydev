import rawInquirer from 'inquirer';

const NO_LOOP_PROMPT_TYPES = new Set(['list', 'checkbox', 'rawlist', 'expand']);

type PromptQuestionLike = {
  type?: unknown;
  loop?: boolean;
  name?: unknown;
  message?: unknown;
};

function applyNoLoopToQuestion<T>(question: T): T {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return question;
  }

  const normalized = question as PromptQuestionLike;
  if (
    typeof normalized.type === 'string'
    && NO_LOOP_PROMPT_TYPES.has(normalized.type)
    && normalized.loop === undefined
  ) {
    return {
      ...(question as Record<string, unknown>),
      loop: false,
    } as T;
  }

  return question;
}

export function applyNoLoopToQuestions<T>(questions: T): T {
  if (Array.isArray(questions)) {
    return questions.map((question) => applyNoLoopToQuestion(question)) as T;
  }

  if (!questions || typeof questions !== 'object') {
    return questions;
  }

  const candidate = questions as Record<string, unknown>;
  if ('type' in candidate || 'message' in candidate || 'name' in candidate) {
    return applyNoLoopToQuestion(questions);
  }

  return Object.fromEntries(
    Object.entries(candidate).map(([key, value]) => [key, applyNoLoopToQuestion(value)])
  ) as T;
}

const prompt: typeof rawInquirer.prompt = ((questions: unknown, answers?: unknown) => {
  return rawInquirer.prompt(applyNoLoopToQuestions(questions) as any, answers as any);
}) as typeof rawInquirer.prompt;

const inquirer = {
  ...rawInquirer,
  prompt,
  Separator: rawInquirer.Separator,
} as typeof rawInquirer;

export default inquirer;

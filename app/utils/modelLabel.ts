export interface ParsedModelLabel {
  company?: string;
  modelName: string;
  version?: string;
  versionDetail?: string;
}

/**
 * Best-effort split of a model label into browsable pieces. Model names aren't
 * standardized across vendors, so this is a heuristic, not a guarantee:
 * - "Company: Rest" -> company = "Company"
 * - a trailing "(...)" -> versionDetail, e.g. "(Fast)", "(free)"
 * - the last token starting with a digit (scanning from the end) -> version,
 *   everything after it -> appended to versionDetail, everything before it -> modelName
 *
 * Examples: "Anthropic: Claude Sonnet 4.5" -> { company: "Anthropic", modelName: "Claude Sonnet", version: "4.5" }
 *           "Meta: Llama 3.3 70B Instruct" -> { company: "Meta", modelName: "Llama 3.3", version: "70B", versionDetail: "Instruct" }
 */
export function parseModelLabel(label: string): ParsedModelLabel {
  let rest = label.trim();
  let company: string | undefined;

  const colonIdx = rest.indexOf(': ');

  if (colonIdx !== -1 && colonIdx < 30) {
    company = rest.slice(0, colonIdx);
    rest = rest.slice(colonIdx + 2).trim();
  }

  let versionDetail: string | undefined;
  const parenMatch = rest.match(/\s*\(([^)]+)\)\s*$/);

  if (parenMatch) {
    versionDetail = parenMatch[1];
    rest = rest.slice(0, parenMatch.index).trim();
  }

  const tokens = rest.split(' ').filter(Boolean);
  let versionIndex = -1;

  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^v?\d/i.test(tokens[i])) {
      versionIndex = i;
      break;
    }
  }

  if (versionIndex === -1) {
    return { company, modelName: rest, versionDetail };
  }

  const version = tokens[versionIndex];
  const trailingWords = tokens.slice(versionIndex + 1).join(' ');
  const modelName = tokens.slice(0, versionIndex).join(' ') || rest;

  return {
    company,
    modelName,
    version,
    versionDetail: [trailingWords, versionDetail].filter(Boolean).join(' ') || undefined,
  };
}

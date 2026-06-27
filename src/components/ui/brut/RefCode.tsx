/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <RefCode> — renders a single reference code in mono 11px uppercase, letter-
 * spacing 0.04em, `--text-3`. Used anywhere the ticket grammar needs a label
 * but a full <Ticket> nameplate would be overkill.
 *
 *   <RefCode ns="REC" id="A8F3" />        → "REC-A8F3"
 *   <RefCode ns="ING" id="07" />          → "ING-07"
 *   <RefCode ns="STP" id="03/07" />       → "STP-03/07"
 *   <RefCode ns="TAG" id="dessert" />     → "#DESSERT"
 *   <RefCode ns="USR" id="JC" />          → "USR·JC"
 *
 * Separator overrides (`-` | `·` | `#`) exist for the two irregular namespaces:
 *   - TAG defaults to `#` sigil (no `TAG-` prefix printed)
 *   - USR defaults to `·` middle dot (a user is a subject, not a spec code)
 * All others default to `-`.
 */

type Namespace = 'REC' | 'ING' | 'STP' | 'TAG' | 'COOK' | 'USR' | 'VER' | 'FIG';
type Separator = '-' | '·' | '#';

type RefCodeProps = {
  ns: Namespace;
  id: string;
  separator?: Separator;
  className?: string;
};

function defaultSeparator(ns: Namespace): Separator {
  if (ns === 'TAG') return '#';
  if (ns === 'USR') return '·';
  return '-';
}

export function RefCode({ ns, id, separator, className = '' }: RefCodeProps) {
  const sep = separator ?? defaultSeparator(ns);
  const body = id.toUpperCase();
  // TAG with `#` sigil suppresses the namespace prefix — the sigil IS the
  // namespace.  All other combinations print "<NS><sep><ID>".
  const text = (ns === 'TAG' && sep === '#') ? `#${body}` : `${ns}${sep}${body}`;
  return (
    <span className={`brut-refcode ${className}`.trim()}>{text}</span>
  );
}

/**
 * People show by name alone, without the "Adv." honorific (owner, Sept 17);
 * the role sits in the label beside the name instead. Display only: records
 * and viewer matching keep the stored string.
 */
export function displayName(name: string): string {
  return name.replace(/\bAdv\.\s+/g, "");
}

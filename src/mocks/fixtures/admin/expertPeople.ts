// Names and portraits for matched experts, shown to the PM (the client sees "Expert A" until
// booked). Portraits are randomuser.me placeholders, stored in public/images/avatars/experts.
const PEOPLE = [
  'Lukas Brandt',
  'Anna Schreiber',
  'Piotr Nowak',
  'Katarzyna Wójcik',
  'Erik Lindqvist',
  'Sofia Nilsson',
  'Thomas Claes',
  'Lotte Peeters',
  'Antoine Mercier',
  'Camille Laurent',
  'Mikko Virtanen',
  'Aino Korhonen',
  'Daan de Vries',
  'Eva Janssen',
  'Stefan Huber',
  'Lena Gruber',
  'Jonas Madsen',
  'Freja Nielsen',
  'Conor Walsh',
  'Niamh Byrne',
  'Marek Kowalczyk',
  'Julia Weber',
  'Henrik Berg',
  'Ingrid Holm',
] as const;

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
}

/** The same expert always gets the same person; Expert #4821 is always Lukas Brandt. */
export function expertPerson(expertId: string): { name: string; photoUrl: string } {
  const num = Number(expertId.replace(/\D/g, '')) || 0;
  const name = expertId === 'exp_4821' ? PEOPLE[0] : (PEOPLE[num % PEOPLE.length] ?? PEOPLE[0]);
  return { name, photoUrl: `/images/avatars/experts/${slug(name)}.jpg` };
}

// Names and portraits for matched experts, shown to the PM (the client sees "Expert A" until
// booked). Portraits are randomuser.me placeholders, stored in public/images/avatars/experts.
const PEOPLE = [
  'Jake Morrison',
  'Emily Carter',
  'Tyler Reed',
  'Hannah Brooks',
  'Marcus Hayes',
  'Olivia Bennett',
  'Ryan Foster',
  'Megan Price',
  'Daniel Shaw',
  'Sophia Bell',
  'Kevin Walsh',
  'Rachel Adams',
  'Brandon Cole',
  'Jessica Lane',
  'Nathan Ellis',
  'Lauren Mitchell',
  'Chris Dalton',
  'Ashley Turner',
  'Derek Hall',
  'Amanda Ross',
  'Justin Wade',
  'Kayla Hughes',
  'Evan Porter',
  'Natalie Grant',
] as const;

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
}

/** The same expert always gets the same person; Expert #4821 is always Jake Morrison. */
export function expertPerson(expertId: string): { name: string; photoUrl: string } {
  const num = Number(expertId.replace(/\D/g, '')) || 0;
  const name = expertId === 'exp_4821' ? PEOPLE[0] : (PEOPLE[num % PEOPLE.length] ?? PEOPLE[0]);
  return { name, photoUrl: `/images/avatars/experts/${slug(name)}.jpg` };
}

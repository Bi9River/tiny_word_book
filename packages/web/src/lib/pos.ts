export const swedishOrdklasser = [
	'substantiv',
	'verb',
	'adjektiv',
	'adverb',
	'pronomen',
	'preposition',
	'konjunktion',
	'subjunktion',
	'interjektion',
	'räkneord',
	'artikel'
] as const;

export type SwedishOrdklass = (typeof swedishOrdklasser)[number];

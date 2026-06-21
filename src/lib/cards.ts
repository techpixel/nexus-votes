// Balatro-style card catalogue, ported from the nexus_cards_html prototype.
// Each card has a full-art sprite (static/cards/<frame>.webp) plus its playing-card
// identity: r = rank (2-10, J=11, Q=12, K=13, A=14), s = suit (C/S/H/D).

export type Suit = 'C' | 'S' | 'H' | 'D';

export interface Card {
	/** sprite id — image lives at /cards/<frame>.webp */
	frame: string;
	/** themed art name, e.g. "uranium" */
	name: string;
	desc: string;
	/** playing-card rank (2-10, J=11, Q=12, K=13, A=14); omitted for the wildcard Joker */
	r?: number;
	/** playing-card suit; omitted for the wildcard Joker */
	s?: Suit;
	/** true for the wildcard Joker, which has no fixed rank or suit */
	joker?: true;
}

export const CARDS: Card[] = [
	{ frame: '327-1', name: 'collection', desc: 'gotta have them all', r: 2, s: 'C' },
	{ frame: '327-2', name: 'ufo', desc: 'out of this world', r: 14, s: 'S' },
	{ frame: '327-3', name: 'spy', desc: 'hidden in plain sight', r: 14, s: 'H' },
	{ frame: '327-4', name: 'pi(e)', desc: 'irrational and delicious', r: 14, s: 'D' },
	{ frame: '327', name: 'fraud', desc: 'too good to be true', r: 14, s: 'C' },
	{ frame: '515', name: 'cheesy', desc: 'extra topping, extra fun', r: 2, s: 'S' },
	{ frame: '516', name: 'stolen', desc: 'finders keepers', r: 2, s: 'H' },
	{ frame: '517', name: 'fish', desc: "something's fishy", r: 2, s: 'D' },
	{ frame: '518', name: 'fly', desc: 'buzz off', r: 3, s: 'C' },
	{ frame: '519', name: 'home', desc: 'no place like it', r: 3, s: 'S' },
	{ frame: '520', name: 'two', desc: 'the magic number', r: 3, s: 'H' },
	{ frame: '521', name: 'order', desc: 'everything in its place', r: 3, s: 'D' },
	{ frame: '522', name: 'greed', desc: 'never enough', r: 4, s: 'C' },
	{ frame: '523', name: 'retro', desc: 'stay groovy', r: 4, s: 'S' },
	{ frame: '524', name: 'metropolitan', desc: 'the city that never sleeps', r: 4, s: 'H' },
	{ frame: '525', name: 'banana', desc: 'a-peeling', r: 4, s: 'D' },
	{ frame: '526', name: 'space', desc: 'the final frontier', r: 5, s: 'C' },
	{ frame: '527', name: 'orbit', desc: 'round and round', r: 5, s: 'S' },
	{ frame: '528', name: 'anarchy', desc: 'no gods, no masters', r: 5, s: 'H' },
	{ frame: '529', name: 'morph', desc: 'ever-changing', r: 5, s: 'D' },
	{ frame: '530', name: 'cool', desc: 'too cool for school', r: 6, s: 'C' },
	{ frame: '531', name: 'call', desc: 'ring ring', r: 6, s: 'S' },
	{ frame: '532', name: 'permanent', desc: 'here to stay', r: 6, s: 'H' },
	{ frame: '533', name: 'unity', desc: 'stronger together', r: 6, s: 'D' },
	{ frame: '534', name: 'shift', desc: 'lowercase to UPPER', r: 7, s: 'C' },
	{ frame: '535', name: 'imperfection', desc: 'perfectly flawed', r: 7, s: 'S' },
	{ frame: '536', name: 'impermanent', desc: 'nothing lasts', r: 7, s: 'H' },
	{ frame: '537', name: 'ring', desc: 'one to rule them all', r: 7, s: 'D' },
	{ frame: '538', name: 'smol', desc: 'tiny but mighty', r: 8, s: 'C' },
	{ frame: '539', name: 'magic', desc: 'now you see it', r: 8, s: 'S' },
	{ frame: '540', name: 'teamwork', desc: 'makes the dream work', r: 8, s: 'H' },
	{ frame: '541', name: 'do-over', desc: 'try again', r: 8, s: 'D' },
	{ frame: '542', name: 'cycle', desc: 'what goes around', r: 9, s: 'C' },
	{ frame: '543', name: 'classic', desc: 'never out of style', r: 9, s: 'S' },
	{ frame: '544', name: 'drive', desc: 'floor it', r: 9, s: 'H' },
	{ frame: '545', name: 'clippy', desc: "it looks like you're playing a card", r: 9, s: 'D' },
	{ frame: '546', name: 'shark', desc: 'just keep swimming', r: 10, s: 'C' },
	{ frame: '547', name: 'shop', desc: 'everything must go', r: 10, s: 'S' },
	{ frame: '548', name: 'crispy', desc: 'scan me', r: 10, s: 'H' },
	{ frame: '549', name: 'gambling', desc: 'the house always wins', r: 10, s: 'D' },
	{ frame: '550', name: 'burn', desc: 'watch it all go up', r: 11, s: 'C' },
	{ frame: '551', name: 'explosion', desc: 'boom', r: 11, s: 'S' },
	{ frame: '552', name: 'spectrum', desc: 'all the colours', r: 11, s: 'H' },
	{ frame: '553', name: 'polaroid', desc: 'instant memories', r: 11, s: 'D' },
	{ frame: '554', name: 'meow', desc: 'purrfect', r: 12, s: 'C' },
	{ frame: '555', name: 'time', desc: 'tick tock', r: 12, s: 'S' },
	{ frame: '556', name: 'uranium', desc: 'highly reactive', r: 12, s: 'H' },
	{ frame: '557', name: 'motion', desc: 'objects in motion', r: 12, s: 'D' },
	{ frame: '558', name: 'box', desc: "what's inside?", r: 13, s: 'C' },
	{ frame: '559', name: 'big', desc: 'go big or go home', r: 13, s: 'S' },
	{ frame: '560', name: 'tool', desc: 'the right one for the job', r: 13, s: 'H' },
	{ frame: '561', name: 'ferret', desc: 'weasel your way in', r: 13, s: 'D' },
	{ frame: 'joker', name: 'wildcard', desc: 'plays as anything', joker: true }
];

const CARD_BY_NAME = new Map(CARDS.map((c) => [c.name.toLowerCase(), c]));
const CARD_BY_KEY = new Map(CARDS.filter((c) => !c.joker).map((c) => [`${c.r}${c.s}`, c]));
const JOKER = CARDS.find((c) => c.joker) ?? null;

const RANK_TOKENS: Record<string, number> = {
	'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
	T: 10, J: 11, Q: 12, K: 13, A: 14
};
const SUIT_TOKENS: Record<string, Suit> = {
	S: 'S', H: 'H', C: 'C', D: 'D', '♠': 'S', '♥': 'H', '♣': 'C', '♦': 'D'
};

const RANK_WORDS: Record<string, number> = {
	ace: 14, king: 13, queen: 12, jack: 11, ten: 10, nine: 9, eight: 8, seven: 7,
	six: 6, five: 5, four: 4, three: 3, two: 2
};
const SUIT_WORDS: Record<string, Suit> = {
	heart: 'H', hearts: 'H', spade: 'S', spades: 'S',
	club: 'C', clubs: 'C', diamond: 'D', diamonds: 'D'
};

const RANK_NAMES: Record<number, string> = {
	14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: '10',
	9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2'
};
const SUIT_NAMES: Record<Suit, string> = { C: 'Clubs', S: 'Spades', H: 'Hearts', D: 'Diamonds' };

/**
 * Resolve a free-text token to a card. Accepts:
 *  - a themed name  ("uranium", "orbit")
 *  - a rank/suit token  ("QH", "10S", "AS", "T♥")
 *  - a full english name  ("Queen of Hearts", "ten of clubs")
 * Returns null if nothing matches.
 */
export function resolveCard(input: string): Card | null {
	if (!input) return null;
	const t = input.trim();
	if (!t) return null;

	const lower = t.toLowerCase();
	if (lower === 'joker' || lower === 'jokers') return JOKER;

	const byName = CARD_BY_NAME.get(lower);
	if (byName) return byName;

	const token = t.toUpperCase().match(/^(10|[2-9TJQKA])\s*([SHCD♠♥♣♦])$/);
	if (token) return CARD_BY_KEY.get(`${RANK_TOKENS[token[1]]}${SUIT_TOKENS[token[2]]}`) ?? null;

	const words = t.toLowerCase().match(/^(\w+)\s+of\s+(\w+)$/);
	if (words) {
		const rank = RANK_WORDS[words[1]] ?? (RANK_TOKENS[words[1]] || null);
		const suit = SUIT_WORDS[words[2]];
		if (rank && suit) return CARD_BY_KEY.get(`${rank}${suit}`) ?? null;
	}
	return null;
}

export const cardImage = (card: Card): string => `/cards/${card.frame}.webp`;

/** Playing-card label, e.g. "Queen of Hearts" (or "Joker" for the wildcard). */
export const cardLabel = (card: Card): string =>
	card.joker || card.r === undefined || card.s === undefined
		? 'Joker'
		: `${RANK_NAMES[card.r]} of ${SUIT_NAMES[card.s]}`;

/** Stable code for storage, e.g. "QH", "10S", "JOKER". */
export function cardCode(card: Card): string {
	if (card.joker || card.r === undefined || card.s === undefined) return 'JOKER';
	const rank =
		card.r === 14 ? 'A' : card.r === 13 ? 'K' : card.r === 12 ? 'Q' : card.r === 11 ? 'J' : String(card.r);
	return `${rank}${card.s}`;
}

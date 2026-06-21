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
	{ frame: '522', name: 'greg', desc: 'frog', r: 4, s: 'C' },
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

/** Title-cased theme name for a card, e.g. "uranium" → "Uranium". */
export const themeLabel = (card: Card): string => card.name.charAt(0).toUpperCase() + card.name.slice(1);

/** Resolve a list of stored codes (e.g. "AS QH 5S") to cards, dropping unknowns. */
export function cardsFromCodes(codes: string[]): Card[] {
	return codes
		.map((code) => resolveCard(code))
		.filter((c): c is Card => c !== null);
}

// ---- poker-hand evaluation (Balatro-flavoured) ----------------------------
// Used on the "Add your cards" step to detect what hand the chosen cards make,
// let the player pick among the hands they can form, and show its mult. The
// catalogue + mults come from the Horizons "Score Guide" and include the three
// Balatro "secret" hands (Five of a Kind, Flush House, Flush Five), which in
// this single-of-each deck are only reachable with a wildcard Joker.

export interface HandType {
	/** display name, e.g. "Two Pair" */
	name: string;
	/** score multiplier shown next to the played hand */
	mult: number;
}

// Ordered by strength: the index is the strength rank (higher beats lower) and
// is what the evaluator returns. Keep this order stable — other helpers index
// into it by position.
export const HAND_TYPES: HandType[] = [
	{ name: 'High Card', mult: 1 }, //        0
	{ name: 'One Pair', mult: 3 }, //         1
	{ name: 'Two Pair', mult: 4 }, //         2
	{ name: 'Three of a Kind', mult: 4 }, //  3
	{ name: 'Straight', mult: 5 }, //         4
	{ name: 'Flush', mult: 5 }, //            5
	{ name: 'Full House', mult: 6 }, //       6
	{ name: 'Four of a Kind', mult: 7 }, //   7
	{ name: 'Straight Flush', mult: 8 }, //   8
	{ name: 'Five of a Kind', mult: 8 }, //   9
	{ name: 'Flush House', mult: 10 }, //    10
	{ name: 'Royal Flush', mult: 12 }, //    11
	{ name: 'Flush Five', mult: 12 } //      12
];

const HAND_INDEX_BY_NAME = new Map(HAND_TYPES.map((h, i) => [h.name.toLowerCase(), i]));

// Hands scored with all five cards (vs. of-a-kind hands that leave kickers out).
const ALL_FIVE = new Set([4, 5, 6, 8, 9, 10, 11, 12]);

const ALL_SUITS: Suit[] = ['C', 'S', 'H', 'D'];

interface RankedCard {
	r: number;
	s: Suit;
}

/** Rank a 1–5 card hand of concrete (non-wild) cards; returns a HAND_TYPES index. */
function rankConcrete(cards: RankedCard[]): number {
	const n = cards.length;
	if (n === 0) return -1;
	const rankCount = new Map<number, number>();
	const suits = new Set<Suit>();
	for (const c of cards) {
		rankCount.set(c.r, (rankCount.get(c.r) ?? 0) + 1);
		suits.add(c.s);
	}
	const counts = [...rankCount.values()].sort((a, b) => b - a);
	const flush = n === 5 && suits.size === 1;
	let straight = false;
	let high = 0;
	if (n === 5 && rankCount.size === 5) {
		const rs = [...rankCount.keys()].sort((a, b) => a - b);
		if (rs[4] - rs[0] === 4) {
			straight = true;
			high = rs[4];
		} else if (rs[0] === 2 && rs[4] === 14 && rs[3] === 5) {
			straight = true; // wheel: A-2-3-4-5
			high = 5;
		}
	}

	if (counts[0] === 5 && flush) return 12; // Flush Five
	if (flush && counts[0] === 3 && counts[1] === 2) return 10; // Flush House
	if (counts[0] === 5) return 9; // Five of a Kind
	if (straight && flush) return high === 14 ? 11 : 8; // Royal / Straight Flush
	if (counts[0] === 4) return 7; // Four of a Kind
	if (counts[0] === 3 && counts[1] === 2) return 6; // Full House
	if (flush) return 5; // Flush
	if (straight) return 4; // Straight
	if (counts[0] === 3) return 3; // Three of a Kind
	if (counts[0] === 2 && counts[1] === 2) return 2; // Two Pair
	if (counts[0] === 2) return 1; // One Pair
	return 0; // High Card
}

// Each wildcard (Joker) tries every rank/suit; keep the strongest result.
function bestConcrete(concrete: RankedCard[], wild: number): number {
	if (wild === 0) return rankConcrete(concrete);
	let best = -1;
	for (let r = 2; r <= 14; r++)
		for (const s of ALL_SUITS) best = Math.max(best, bestConcrete([...concrete, { r, s }], wild - 1));
	return best;
}

function splitWild(cards: Card[]): { concrete: RankedCard[]; wild: number } {
	const concrete: RankedCard[] = [];
	let wild = 0;
	for (const c of cards) {
		if (c.joker || c.r === undefined || c.s === undefined) wild++;
		else concrete.push({ r: c.r, s: c.s });
	}
	return { concrete, wild };
}

/** Best hand index these cards can make (Joker counts as wild); -1 if no cards. */
export function bestHandIndex(cards: Card[]): number {
	const { concrete, wild } = splitWild(cards);
	return bestConcrete(concrete, wild);
}

/**
 * Every distinct hand the chosen cards can be played as, strongest first (each a
 * HAND_TYPES index). Found by ranking every non-empty subset of the cards, so a
 * Full House also surfaces Three of a Kind, Two Pair, One Pair and High Card —
 * each a real alternative that commits a different set of themes. Capped at the
 * 5-card hand limit, so this is at most 31 subsets.
 */
export function handOptions(cards: Card[]): number[] {
	const n = cards.length;
	if (n === 0) return [];
	const found = new Set<number>();
	for (let mask = 1; mask < 1 << n; mask++) {
		const subset = cards.filter((_, i) => (mask & (1 << i)) !== 0);
		const cat = bestHandIndex(subset);
		if (cat >= 0) found.add(cat);
	}
	return [...found].sort((a, b) => b - a);
}

/**
 * Which card frames actually form the given hand category (the rest are kickers).
 * Of-a-kind hands keep only the matched group (+ wild fillers); the five-card
 * hands use everything.
 */
export function playedFrames(cards: Card[], categoryIndex: number): Set<string> {
	const played = new Set<string>();
	if (cards.length === 0 || categoryIndex < 0) return played;

	if (ALL_FIVE.has(categoryIndex)) {
		for (const c of cards) played.add(c.frame);
		return played;
	}

	const jokers = cards.filter((c) => c.joker || c.r === undefined || c.s === undefined);
	const concrete = cards.filter((c) => !c.joker && c.r !== undefined && c.s !== undefined);

	// Group concrete cards by rank, biggest groups (then highest rank) first.
	const byRank = new Map<number, Card[]>();
	for (const c of concrete) {
		const arr = byRank.get(c.r as number) ?? [];
		arr.push(c);
		byRank.set(c.r as number, arr);
	}
	const groups = [...byRank.entries()]
		.map(([r, cs]) => ({ r, cs }))
		.sort((a, b) => b.cs.length - a.cs.length || b.r - a.r);

	const jokerFrames = jokers.map((j) => j.frame);
	let jIdx = 0;
	const take = (g: { r: number; cs: Card[] } | undefined, need: number) => {
		let have = 0;
		for (const c of g?.cs ?? []) {
			played.add(c.frame);
			have++;
		}
		while (have < need && jIdx < jokerFrames.length) {
			played.add(jokerFrames[jIdx++]);
			have++;
		}
	};

	if (categoryIndex === 7) take(groups[0], 4); // four of a kind
	else if (categoryIndex === 3) take(groups[0], 3); // three of a kind
	else if (categoryIndex === 2) {
		take(groups[0], 2); // two pair
		take(groups[1] ?? groups[0], 2);
	} else if (categoryIndex === 1) take(groups[0], 2); // one pair
	else if (jokerFrames.length) played.add(jokerFrames[0]); // high card (wild is highest)
	else if (concrete.length)
		played.add(concrete.reduce((a, b) => ((a.r as number) >= (b.r as number) ? a : b)).frame);

	return played;
}

/** HAND_TYPES index for a stored hand name (case-insensitive); -1 if unknown. */
export const handIndexByName = (name: string): number =>
	HAND_INDEX_BY_NAME.get(name.trim().toLowerCase()) ?? -1;

/** Display name for a hand index, or '' if out of range. */
export const handName = (index: number): string => HAND_TYPES[index]?.name ?? '';

/** Mult for a hand index, or 0 if out of range. */
export const handMult = (index: number): number => HAND_TYPES[index]?.mult ?? 0;

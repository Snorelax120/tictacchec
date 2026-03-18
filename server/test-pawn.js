import { isValidMove } from './gameUtils.js';

let failed = 0;
let total = 0;

const assertEq = (actual, expected, msg) => {
    total++;
    if (actual === expected) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}: expected ${expected}, got ${actual}`);
        failed++;
    }
}

// 0  1  2  3
// 4  5  6  7
// 8  9  10 11
// 12 13 14 15

// Test White Pawn moving Forward
let board = Array(16).fill(null);
let pawn = { type: 'pawn', player: 'white' };
board[13] = pawn; // row 3, col 1
assertEq(isValidMove(pawn, 13, 9, board), true, "White pawn move up (empty)"); 
assertEq(isValidMove(pawn, 13, 14, board), false, "White pawn horizontal blocked");

// Test Blocked Forward
board[9] = { type: 'rook', player: 'black' };
assertEq(isValidMove(pawn, 13, 9, board), false, "White pawn blocked forward");

// Test Capture Black Pawn
board[8] = { type: 'rook', player: 'black' };
assertEq(isValidMove(pawn, 13, 8, board), true, "White pawn captures diagonally left");

// Test Bounce at Edge for White
board = Array(16).fill(null);
pawn = { type: 'pawn', player: 'white', direction: -1 };
board[1] = pawn; // row 0, col 1
assertEq(isValidMove(pawn, 1, 5, board), true, "White pawn bounces back (row 0)");

// Test Bounce at Edge for Black
board = Array(16).fill(null);
pawn = { type: 'pawn', player: 'black', direction: 1 };
board[13] = pawn; // row 3, col 1
assertEq(isValidMove(pawn, 13, 9, board), true, "Black pawn bounces back (row 3)");

console.log(`${failed} failed / ${total} total`);

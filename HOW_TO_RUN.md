# ## ✅ Currently Running!

Your game is currently running and ready to play! 🚀

## 🌐 Game URL
Open this in your browser: **http://localhost:5173/**

---o Run Tic Tac Chec

## ✅ Currently Running!

Your game is currently running and ready to play! 🚀

## 🌐 Game URL
Open this in your browser: **http://localhost:5175/**

---

## 📋 Step-by-Step Instructions

### 1️⃣ Start the Backend Server

Open a terminal and run:

```bash
cd /Users/ritwik/Projects/tictacchec/server
npm start
```

✅ You should see: `Server is running on port 3000`

---

### 2️⃣ Start the Frontend Client

Open a **NEW terminal window/tab** and run:

```bash
cd /Users/ritwik/Projects/tictacchec/client
npm run dev
```

✅ You should see: `VITE v7.3.1 ready` with the URL `http://localhost:5173/`

---

### 3️⃣ Play the Game!

Open your browser and go to: **http://localhost:5175/** (or whatever port Vite assigns)

---

## 🎯 How to Play

### Game Rules:
- **4x4 Chess Board** with alternating amber-colored squares
- **Goal**: Get 4 pieces of your color in a row (horizontal, vertical, or diagonal)

### Your Pieces:
- Each player starts with: **Rook**, **Knight**, **Bishop**, and **Pawn**

### Gameplay:
1. **White goes first**
2. Click a piece in your hand to select it (yellow ring appears)
3. Click an empty square on the board to place it
4. Once placed, click your piece on the board to select it
5. Click another square to move it (following chess rules)
6. Capture opponent pieces by moving onto their square
7. **Captured pieces return to the opponent's hand** to be used again!
8. First player to get 4-in-a-row wins! 🏆

### Piece Movement:
- **♜ Rook**: Moves horizontally or vertically (any distance)
- **♞ Knight**: Moves in an L-shape (2+1 or 1+2 squares)
- **♝ Bishop**: Moves diagonally (any distance)
- **♟ Pawn**: Moves 1 forward, captures 1 diagonally, flips at edges

---

## 🛑 How to Stop

Press `Ctrl+C` in each terminal window to stop the servers.

---

## 🔧 Troubleshooting

### Port Already in Use?
If you see "port already in use" errors:

**For the server (port 3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

**For the client (port 5173):**
```bash
lsof -ti:5173 | xargs kill -9
```

Then restart the servers.

### Missing Dependencies?
If you see module errors, reinstall dependencies:

```bash
# In server folder
cd server
npm install

# In client folder  
cd ../client
npm install
```

---

## 🎨 Features

- ✨ Beautiful gradient UI with smooth animations
- 🎯 Real-time move validation
- 🏆 Winner detection and celebration modal
- 🔄 Reset button to start a new game
- 📱 Responsive design (works on mobile too!)
- 💫 Visual feedback for selected pieces
- 🎭 Different colors for each player (Blue for White, Gray for Black)

---

## 🚀 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Real-time**: WebSocket communication
- **Icons**: Lucide React

---

Enjoy your game! 🎮🏆

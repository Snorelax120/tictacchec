import { useState } from 'react';
import { getPawnDisplayDirection } from '@shared/gameRules.js';
import GameScreen from './components/gameplay/GameScreen.jsx';
import BotSetupScreen from './components/screens/BotSetupScreen.jsx';
import MenuScreen from './components/screens/MenuScreen.jsx';
import OnlineCreateScreen from './components/screens/OnlineCreateScreen.jsx';
import OnlineHubScreen from './components/screens/OnlineHubScreen.jsx';
import OnlineJoinScreen from './components/screens/OnlineJoinScreen.jsx';
import OnlineRoomScreen from './components/screens/OnlineRoomScreen.jsx';
import RulesScreen from './components/screens/RulesScreen.jsx';
import { useBotMatchController } from './hooks/useBotMatchController.js';
import { useLocalGameController } from './hooks/useLocalGameController.js';
import { useOnlineLobbyController } from './hooks/useOnlineLobbyController.js';

function App() {
  const [activeScreen, setActiveScreen] = useState('menu');
  const localController = useLocalGameController();
  const botController = useBotMatchController(activeScreen);
  const onlineController = useOnlineLobbyController(setActiveScreen);

  const openMenu = () => {
    botController.clearBotScreenState();
    setActiveScreen('menu');
  };

  const startLocalGame = () => {
    localController.resetLocalGame();
    setActiveScreen('game-local');
  };

  const openBotSetup = () => {
    botController.clearBotScreenState();
    setActiveScreen('bot-setup');
  };

  const openRules = () => {
    setActiveScreen('rules');
  };

  const openOnlineHome = () => {
    setActiveScreen('online-home');
    onlineController.setOnlineFlashMessage('');
  };

  const startBotGame = (event) => {
    botController.handleStartBotGame(event);
    setActiveScreen('game-bot');
  };

  const leaveBotGame = (nextScreen = 'menu') => {
    botController.clearBotScreenState();
    setActiveScreen(nextScreen);
  };

  return (
    <div className="app-shell relative w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_30%)] pointer-events-none" />
      <div className="absolute left-[-10rem] top-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute right-[-8rem] bottom-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="app-safe-shell relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
        {activeScreen === 'menu' && (
          <MenuScreen
            onPlayOverBoard={startLocalGame}
            onPlayBot={openBotSetup}
            onOpenRules={openRules}
            onPlayOnline={openOnlineHome}
            hasActiveSession={Boolean(onlineController.onlineSession)}
            onResumeOnline={() => setActiveScreen('online-room')}
          />
        )}

        {activeScreen === 'rules' && <RulesScreen onBack={openMenu} />}

        {activeScreen === 'game-local' && (
          <GameScreen
            board={localController.localGame.board}
            currentTurn={localController.localGame.turn}
            selectedPiece={localController.selectedLocalPiece}
            winner={localController.localGame.winner}
            blackHand={localController.localGame.hands.black}
            whiteHand={localController.localGame.hands.white}
            blackLabel="Black"
            whiteLabel="White"
            topStatus={localController.localStatusMessage}
            onSquareClick={localController.handleLocalSquareClick}
            onHandPieceClick={localController.handleLocalHandPieceClick}
            onBack={openMenu}
            onPrimaryAction={localController.localGame.winner ? localController.resetLocalGame : null}
            primaryActionLabel={localController.localGame.winner ? 'Play Again' : null}
            getPawnDirection={getPawnDisplayDirection}
            mobileHandPlayer={localController.localGame.turn}
          />
        )}

        {activeScreen === 'bot-setup' && (
          <BotSetupScreen
            values={botController.botForms}
            onChange={botController.updateBotForm}
            onSubmit={startBotGame}
            onBack={openMenu}
          />
        )}

        {activeScreen === 'game-bot' && (
          <GameScreen
            board={botController.botGame.board}
            currentTurn={botController.botGame.turn}
            selectedPiece={botController.selectedBotPiece}
            winner={botController.botGame.winner}
            blackHand={botController.botGame.hands.black}
            whiteHand={botController.botGame.hands.white}
            blackLabel={botController.botBlackLabel}
            whiteLabel={botController.botWhiteLabel}
            topStatus={botController.botStatusMessage}
            onSquareClick={botController.handleBotSquareClick}
            onHandPieceClick={botController.handleBotHandPieceClick}
            onBack={() => leaveBotGame('menu')}
            onPrimaryAction={botController.botGame.winner ? botController.resetBotGame : null}
            primaryActionLabel={botController.botGame.winner ? 'Play Again' : null}
            primaryActionDisabled={botController.isBotThinking}
            getPawnDirection={getPawnDisplayDirection}
            bottomNotice={botController.botFlashMessage}
            mobileHandPlayer={botController.botMatch?.humanSeat || 'white'}
          />
        )}

        {activeScreen === 'online-home' && (
          <OnlineHubScreen
            onBack={openMenu}
            onOpenCreate={() => setActiveScreen('online-create')}
            onOpenJoin={() => setActiveScreen('online-join')}
            flashMessage={onlineController.onlineFlashMessage}
            hasActiveSession={Boolean(onlineController.onlineSession)}
            onResumeLobby={() => setActiveScreen('online-room')}
          />
        )}

        {activeScreen === 'online-create' && (
          <OnlineCreateScreen
            values={onlineController.onlineForms}
            isSubmitting={onlineController.isSubmitting}
            flashMessage={onlineController.onlineFlashMessage}
            onChange={onlineController.updateOnlineForm}
            onSubmit={onlineController.handleCreateLobby}
            onBack={openOnlineHome}
          />
        )}

        {activeScreen === 'online-join' && (
          <OnlineJoinScreen
            values={onlineController.onlineForms}
            isSubmitting={onlineController.isSubmitting}
            flashMessage={onlineController.onlineFlashMessage}
            onChange={onlineController.updateOnlineForm}
            onSubmit={onlineController.handleJoinLobby}
            onBack={openOnlineHome}
          />
        )}

        {activeScreen === 'online-room' && (
          <OnlineRoomScreen
            snapshot={onlineController.onlineSnapshot}
            selectedPiece={onlineController.selectedOnlinePiece}
            onSquareClick={onlineController.handleOnlineSquareClick}
            onHandPieceClick={onlineController.handleOnlineHandPieceClick}
            onBack={() => onlineController.leaveOnlineLobby('menu')}
            onRematch={onlineController.handleOnlineRematch}
            onCopyCode={onlineController.handleCopyLobbyCode}
            copyNotice={onlineController.copyNotice}
            socketStatus={onlineController.socketStatus}
            flashMessage={onlineController.onlineFlashMessage}
            getPawnDirection={getPawnDisplayDirection}
          />
        )}
      </div>
    </div>
  );
}

export default App;

const { widget } = figma;
const { useSyncedState, AutoLayout, Frame, Image, Text, useWidgetId } = widget;

import bg from './img/bg.png';
import title from './img/title.png';
import flippy1 from './img/flippy1.png';
import playButton from './img/playButton.png';
import leaderboardButton from './img/leaderboardButton.png';
import gameOverText from './img/gameover.png';
import getReadyText from './img/getReady.png';
import scoreboard from './img/scoreboard.png';
import newTag from './img/newTag.png';
import leaderboard from './img/leaderboard.png';
import medalBronze from './img/medalBronze.png';
import medalSilver from './img/medalSilver.png';
import medalGold from './img/medalGold.png';
import medalPlatinum from './img/medalPlatinum.png';
import speaker from './img/speaker.png';
import mute from './img/mute.png';

import {
  bgHash,
  groundHash,
  pipeBottomHash,
  pipeTopHash,
  flippyFrame1Hash,
  flippyFrame2Hash,
  flippyFrame3Hash,
  flippyDeadHash,
} from './images';

const containerWidth = 480;
const containerHeight = 640;
const gravity = 0.7;
const jumpAmount = 10;
const gap = 156;
const birdWidth = 45;
const birdHeight = 63;
const hitBoxOffset = 3;
const distanceBeforeObstacle = 1000;

function Widget() {
  const widgetId = useWidgetId();
  const [bgImage, setBgImage] = useSyncedState('bgImage', bg);
  const [gameStarted, setGameStarted] = useSyncedState('gameStarted', false);
  const [jumped, setJumped] = useSyncedState('jump', false);
  const [isGameOver, setIsGameOver] = useSyncedState('isGameOver', false);
  const [currentScore, setCurrentScore] = useSyncedState('currentScore', 0);
  const [bestScore, setBestScore] = useSyncedState('bestScore', 0);
  const [isNewBest, setIsNewBest] = useSyncedState('isNewBest', true);
  const [leaderboardShown, setLeaderboardShown] = useSyncedState(
    'leaderboardShown',
    false
  );
  const [scores, setScores] = useSyncedState('scores', []);
  const [iframeFocused, setIframeFocused] = useSyncedState(
    'iframeFocused',
    true
  );
  const [soundOn, setSoundOn] = useSyncedState('soundOn', true);

  const playGame = () => {
    return new Promise(async (resolve) => {
      let jumped = false;
      let jumpable = true;
      let speed = 0;
      let score = 0;
      const birdLeft = 216;
      let birdTop = 250;
      setCurrentScore(0);
      const widgetNode = figma.getNodeById(widgetId) as WidgetNode;

      // create container
      const container = figma.createFrame();
      container.clipsContent = true;
      container.resize(containerWidth, containerHeight);
      container.fills = [
        {
          type: 'IMAGE',
          scaleMode: 'FILL',
          imageHash: bgHash,
        },
      ];
      container.x = widgetNode.x;
      container.y = widgetNode.y;

      // generate obstacle
      const generateObstacle = (obstacleIndex) => {
        const obstacleWidth = 88;
        const bottomObstacle = figma.createRectangle();
        const topObstacle = figma.createRectangle();
        bottomObstacle.resize(obstacleWidth, 330);
        topObstacle.resize(obstacleWidth, 330);
        bottomObstacle.fills = [
          {
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: pipeBottomHash,
          },
        ];
        topObstacle.fills = [
          {
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: pipeTopHash,
          },
        ];
        container.appendChild(bottomObstacle);
        container.appendChild(topObstacle);
        bottomObstacle.x =
          distanceBeforeObstacle + obstacleIndex * (200 + obstacleWidth) - 4;
        topObstacle.x =
          distanceBeforeObstacle + obstacleIndex * (200 + obstacleWidth) - 4;
        let randomHeight = Math.floor(Math.random() * 260);
        bottomObstacle.y = 230 + randomHeight;
        topObstacle.y = bottomObstacle.y - gap - 330;
        let addedScore = false;
        const moveObstacle = () => {
          if (jumped) {
            bottomObstacle.x -= 4;
            topObstacle.x -= 4;
            // collision detection
            if (
              bottomObstacle.x > birdLeft - obstacleWidth + hitBoxOffset &&
              bottomObstacle.x < birdLeft + birdWidth - hitBoxOffset &&
              (birdTop + birdHeight >= bottomObstacle.y + hitBoxOffset ||
                birdTop <= topObstacle.y + 330 - hitBoxOffset)
            ) {
              if (soundOn) figma.ui.postMessage('fall');
              die();
            }

            // + score
            if (bottomObstacle.x < birdLeft && !addedScore) {
              if (soundOn) figma.ui.postMessage('point');
              score++;
              addedScore = true;
              scoreText.characters = score.toString();
            }
            // off screen
            if (bottomObstacle.x === -obstacleWidth) {
              bottomObstacle.x = containerWidth + 296;
              topObstacle.x = containerWidth + 296;
              randomHeight = Math.floor(Math.random() * 260);
              bottomObstacle.y = 230 + randomHeight;
              topObstacle.y = bottomObstacle.y - gap - 330;
              addedScore = false;
            }
          }
        };
        return setInterval(moveObstacle, 20);
      };
      const moveObstacleTimerId0 = generateObstacle(0);
      const moveObstacleTimerId1 = generateObstacle(1);
      const moveObstacleTimerId2 = generateObstacle(2);

      // create ground
      const ground = figma.createRectangle();
      ground.resize(570, 80);
      container.appendChild(ground);
      ground.y = containerHeight - 80;
      ground.fills = [
        {
          type: 'IMAGE',
          scaleMode: 'FILL',
          imageHash: groundHash,
        },
      ];
      const groundMove = () => {
        ground.x -= 4;
        if (ground.x < -80) {
          ground.x = -12;
        }
      };
      const groundTimerId = setInterval(groundMove, 20);

      // create bird
      const bird = figma.createRectangle();
      bird.resize(birdWidth, birdHeight);
      bird.x = birdLeft;
      bird.y = birdTop;
      bird.fills = [
        {
          type: 'IMAGE',
          scaleMode: 'FILL',
          imageHash: flippyFrame1Hash,
        },
      ];
      container.appendChild(bird);

      // animation
      let animationFrame = 1;
      const animationFrames = [
        0,
        flippyFrame1Hash,
        flippyFrame2Hash,
        flippyFrame3Hash,
      ];
      const animate = () => {
        bird.fills = [
          {
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: animationFrames[animationFrame],
          },
        ];
        if (animationFrame < 3) animationFrame++;
        else animationFrame = 1;
      };
      const animateTimerId = setInterval(animate, 150);

      // run game
      const update = () => {
        if (jumped) {
          speed += gravity;
          birdTop += speed;
          bird.y = birdTop;
          if (bird.y < containerHeight - 80 - 40) {
            if (speed <= 8) {
              bird.rotation = 10;
            } else {
              if (bird.rotation > -80) bird.rotation -= speed / 3;
              else bird.rotation = -80;
            }
          } else bird.y = containerHeight - 80 - 40;

          // hits ground
          if (bird.y + birdHeight > containerHeight - 72) {
            clearInterval(updateTimerId);
            if (jumpable) die();
            gameOver();
          }
        }
      };

      const updateTimerId = setInterval(update, 20);

      // jump
      const jump = () => {
        if (soundOn) figma.ui.postMessage('flap');
        speed = -jumpAmount;
      };

      const firstJump = () => {
        setJumped(true);
        jumped = true;
        scoreText.visible = true;
        jump();
      };

      // score text
      const scoreText = figma.createText();
      container.appendChild(scoreText);
      await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
      await figma.loadFontAsync({ family: 'Teko', style: 'Medium' });
      scoreText.fontSize = 68;
      scoreText.letterSpacing = { value: 10, unit: 'PERCENT' };
      scoreText.fontName = { family: 'Teko', style: 'Medium' };
      scoreText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      scoreText.strokes = [
        { type: 'SOLID', color: { r: 65 / 255, g: 41 / 255, b: 55 / 255 } },
      ];
      scoreText.strokeWeight = 3;
      scoreText.strokeAlign = 'OUTSIDE';
      scoreText.textAlignHorizontal = 'CENTER';
      scoreText.characters = score.toString();
      scoreText.x = 225;
      scoreText.y = 76;
      scoreText.visible = false;

      const die = () => {
        if (soundOn) figma.ui.postMessage('die');
        clearInterval(moveObstacleTimerId0);
        clearInterval(moveObstacleTimerId1);
        clearInterval(moveObstacleTimerId2);
        clearInterval(animateTimerId);
        clearInterval(groundTimerId);
        bird.fills = [
          {
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: flippyDeadHash,
          },
        ];
        jumpable = false;
      };

      const gameOver = async () => {
        updateScores();
        setIsGameOver(true);
        scoreText.remove();
        figma.ui.hide();
        const array = await container.exportAsync({
          format: 'JPG',
          contentsOnly: false,
        });
        figma.ui.postMessage(array);
      };

      const updateScores = () => {
        setCurrentScore(score);
        if (score > bestScore) {
          setBestScore(score);
          setIsNewBest(true);
        } else {
          setIsNewBest(false);
        }
        let oldScores = scores;
        const firstName = figma.currentUser.name.split(' ')[0];
        const lastNameInitial = figma.currentUser.name.split(' ')[1][0];
        oldScores.push({
          name: `${firstName} ${lastNameInitial}.`,
          score: score,
        });
        setScores(oldScores);
      };

      // clean up
      figma.on('close', async () => {});

      // handle iframe event
      figma.ui.onmessage = (message) => {
        switch (message) {
          case 'jump':
            if (!jumped) firstJump();
            if (jumpable) jump();
            break;
          case 'blur':
            if (!jumped) setIframeFocused(false);
            break;
          case 'focus':
            if (!jumped) setIframeFocused(true);
            break;
          default:
            setBgImage(message);
            setTimeout(() => {
              figma.closePlugin();
            }, 500);
        }
      };
      figma.showUI(__html__, {
        width: 216,
        height: 108,
      });
      if (soundOn) figma.ui.postMessage('swoosh');
      container.appendChild(widgetNode);
      widgetNode.x = 0;
      widgetNode.y = 0;
    });
  };
  const cleanup = () => {
    const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
    const oldContainer = widgetNode.parent as FrameNode;
    figma.currentPage.appendChild(widgetNode);
    widgetNode.x = oldContainer.x;
    widgetNode.y = oldContainer.y;
    oldContainer.remove();
  };

  const medalImg = (score) => {
    if (score >= 5 && score < 10) return medalBronze;
    if (score >= 10 && score < 20) return medalSilver;
    if (score >= 20 && score < 30) return medalGold;
    if (score >= 30) return medalPlatinum;
  };

  return (
    <Frame
      width={containerWidth}
      height={containerHeight}
      fill={!gameStarted && { type: 'image', src: bgImage }}
    >
      {!gameStarted && (
        <Image
          name="title"
          x={116}
          y={108}
          width={248}
          height={74}
          src={title}
        />
      )}
      {!gameStarted && (
        <Image
          name="flippy"
          x={216}
          y={250}
          width={45}
          height={63}
          src={flippy1}
        />
      )}
      {(!gameStarted || isGameOver) && (
        <Image
          name="playButton"
          x={gameStarted ? 48 : 159}
          y={454}
          width={162}
          height={90}
          src={playButton}
          onClick={() => {
            if (figma.getNodeById(widgetId).parent !== figma.currentPage)
              cleanup();
            figma.currentPage.selection = [];
            setLeaderboardShown(false);
            setGameStarted(true);
            setIsGameOver(false);
            setJumped(false);
            return playGame();
          }}
        />
      )}
      {isGameOver && (
        <Image
          name="leaderboardButton"
          x={270}
          y={454}
          width={162}
          height={90}
          src={leaderboardButton}
          onClick={() => {
            setLeaderboardShown(!leaderboardShown);
          }}
        />
      )}
      {gameStarted && !jumped && !isGameOver && (
        <Image
          name="getReady"
          x={102}
          y={86}
          width={276}
          height={75}
          src={getReadyText}
        />
      )}
      {gameStarted && !jumped && !isGameOver && (
        <Text
          name={'hint'}
          x={240}
          y={466}
          fill={'#FAFAFA'}
          verticalAlignText={'center'}
          horizontalAlignText={'center'}
          fontFamily={'Teko'}
          fontSize={32}
          fontWeight={700}
          stroke={'#412937'}
          strokeWidth={3}
          strokeAlign={'OUTSIDE'}
        >
          {iframeFocused ? 'Press Space to flap' : 'Click Flap button'}
        </Text>
      )}
      {isGameOver && (
        <Image
          name="gameover"
          x={96}
          y={118}
          width={288}
          height={63}
          src={gameOverText}
        />
      )}
      {isGameOver && (
        <Frame
          name="scoreboard"
          x={60}
          y={213}
          width={360}
          height={185}
          fill={{ type: 'image', src: scoreboard }}
        >
          {currentScore > 5 && (
            <Image
              name="medal"
              x={41}
              y={67}
              width={70}
              height={70}
              src={medalImg(currentScore)}
            />
          )}
          <Text
            name={'currentScore'}
            x={323}
            y={48}
            fill={'#FFF'}
            horizontalAlignText={'right'}
            fontFamily={'Teko'}
            fontSize={32}
            fontWeight={700}
            letterSpacing={5.1}
            stroke={'#412937'}
            strokeWidth={3}
            strokeAlign={'OUTSIDE'}
          >
            {currentScore.toString()}
          </Text>
          <Text
            name={'bestScore'}
            x={323}
            y={115}
            fill={'#FFF'}
            horizontalAlignText={'right'}
            fontFamily={'Teko'}
            fontSize={32}
            fontWeight={700}
            letterSpacing={5.1}
            stroke={'#412937'}
            strokeWidth={3}
            strokeAlign={'OUTSIDE'}
          >
            {bestScore.toString()}
          </Text>
          {isNewBest && (
            <Image
              name="newTag"
              x={214}
              y={93}
              width={51}
              height={22}
              src={newTag}
            />
          )}
        </Frame>
      )}
      {leaderboardShown && (
        <Frame
          name="leaderboard"
          x={60}
          y={70}
          width={360}
          height={340}
          fill={{ type: 'image', src: leaderboard }}
        >
          <AutoLayout
            name={'scores'}
            x={32}
            y={58}
            overflow={'visible'}
            direction={'vertical'}
            spacing={4}
            width={297}
          >
            {scores
              .reduce((acc, current) => {
                const x = acc.find(
                  (item) =>
                    item.name === current.name && item.score === current.score
                );
                if (!x) {
                  return acc.concat([current]);
                } else {
                  return acc;
                }
              }, [])
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((entry, index) => (
                <AutoLayout
                  name={'row'}
                  key={entry.name + entry.score}
                  overflow={'visible'}
                  spacing={'auto'}
                  width={'fill-parent'}
                  verticalAlignItems={'center'}
                >
                  <AutoLayout
                    name={'rank & name'}
                    overflow={'visible'}
                    spacing={24}
                  >
                    <Text
                      name={'rank'}
                      fill={'#EDEDED'}
                      width={12}
                      verticalAlignText={'center'}
                      horizontalAlignText={'center'}
                      fontFamily={'Teko'}
                      fontSize={34}
                      fontWeight={700}
                      stroke={'#412937'}
                      strokeWidth={3}
                      strokeAlign={'OUTSIDE'}
                    >
                      {index + 1}
                    </Text>
                    <Text
                      name={'name'}
                      fill={'#EDEDED'}
                      verticalAlignText={'center'}
                      fontFamily={'Teko'}
                      fontSize={34}
                      fontWeight={700}
                      stroke={'#412937'}
                      strokeWidth={3}
                      strokeAlign={'OUTSIDE'}
                    >
                      {entry.name}
                    </Text>
                  </AutoLayout>
                  <Text
                    name={'score'}
                    fill={'#EDEDED'}
                    verticalAlignText={'center'}
                    horizontalAlignText={'right'}
                    fontFamily={'Teko'}
                    fontSize={34}
                    fontWeight={700}
                    stroke={'#412937'}
                    strokeWidth={3}
                    strokeAlign={'OUTSIDE'}
                  >
                    {entry.score}
                  </Text>
                </AutoLayout>
              ))}
          </AutoLayout>
        </Frame>
      )}
      {(!gameStarted || isGameOver) && (
        <Image
          name="muteButton"
          x={432}
          y={594}
          width={32}
          height={32}
          src={soundOn ? speaker : mute}
          onClick={async () =>
            new Promise((resolve) => {
              setSoundOn(!soundOn);
              if (!soundOn) figma.showUI(__html__, { visible: false });
              figma.ui.postMessage('point');
              setTimeout(() => {
                figma.closePlugin();
              }, 1200);
            })
          }
        />
      )}
    </Frame>
  );
}

widget.register(Widget);

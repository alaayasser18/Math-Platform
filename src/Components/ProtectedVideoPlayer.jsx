import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useStudent } from "../context/useStudent";
import { getYouTubeVideoId } from "../utils/youtube";

export default function ProtectedVideoPlayer({
  videoUrl = "",
  title = "شرح المحاضرة - مستر محمد عبد الخالق",
  duration: _duration = "45 دقيقة",
  thumbnail = "/teacher.png",
  videoId = null,
}) {
  const { student, userRole, reportVideoProgress } = useStudent();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const lastReportedTimeRef = useRef(0);

  // ============================================================
  // WATERMARK POSITION
  // ============================================================

  const [watermarkPos, setWatermarkPos] = useState({
    top: 20,
    left: 20,
  });

  // ============================================================
  // REFS
  // ============================================================

  const containerRef = useRef(null);
  const iframeContainerRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // ============================================================
  // YOUTUBE VIDEO ID
  // ============================================================

  const ytVideoId = getYouTubeVideoId(videoUrl);

  // Stable player ID
  const [playerId] = useState(() => `yt-player-${crypto.randomUUID()}`);

  // ============================================================
  // MOVE WATERMARK
  // ============================================================

  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (hasStarted) {
        const randomTop = Math.floor(Math.random() * 65) + 15;

        const randomLeft = Math.floor(Math.random() * 60) + 10;

        setWatermarkPos({
          top: randomTop,
          left: randomLeft,
        });
      }
    }, 12000);

    return () => {
      clearInterval(moveInterval);
    };
  }, [hasStarted]);

  // ============================================================
  // LOAD YOUTUBE IFRAME API
  // ============================================================

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        return;
      }

      playerRef.current = new window.YT.Player(playerId, {
        videoId: ytVideoId,

        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1,
          origin: window.location.origin,
        },

        events: {
          // ------------------------------------------------------
          // PLAYER READY
          // ------------------------------------------------------

          onReady: (event) => {
            setIsPlayerReady(true);
            setIsPlaying(true);

            event.target.playVideo();

            const dur = event.target.getDuration();

            if (dur) {
              setTotalDuration(dur);
            }
          },

          // ------------------------------------------------------
          // PLAYER STATE CHANGE
          // ------------------------------------------------------

          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);

              const dur = playerRef.current?.getDuration();

              if (dur) {
                setTotalDuration(dur);
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    // ----------------------------------------------------------
    // LOAD YOUTUBE SCRIPT
    // ----------------------------------------------------------

    if (!window.YT) {
      const tag = document.createElement("script");

      tag.src = "https://www.youtube.com/iframe_api";

      const firstScriptTag = document.getElementsByTagName("script")[0];

      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {
      if (
        playerRef.current &&
        typeof playerRef.current.destroy === "function"
      ) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);

        timeUpdateIntervalRef.current = null;
      }
    };
  }, [hasStarted, ytVideoId, playerId]);

  // ============================================================
  // TRACK PLAYBACK TIME
  // ============================================================

  useEffect(() => {
    if (isPlaying && isPlayerReady) {
      timeUpdateIntervalRef.current = setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === "function"
        ) {
          const current = playerRef.current.getCurrentTime();

          const dur = playerRef.current.getDuration();

          setCurrentTime(current);

          if (dur && dur !== totalDuration) {
            setTotalDuration(dur);
          }
        }
      }, 500);
    } else {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);

        timeUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);

        timeUpdateIntervalRef.current = null;
      }
    };
  }, [isPlaying, isPlayerReady, totalDuration]);

  // ============================================================
  // SYNC VIDEO PROGRESS WITH BACKEND
  // ============================================================

  useEffect(() => {
    if (userRole !== "student" || !totalDuration || totalDuration <= 0) {
      return;
    }

    const diff = Math.abs(currentTime - lastReportedTimeRef.current);

    const isNearEnd =
      currentTime > 0 && Math.abs(currentTime - totalDuration) < 2;

    if (diff >= 10 || isNearEnd) {
      lastReportedTimeRef.current = currentTime;

      const completionPercentage = Math.min(
        100,
        Math.round((currentTime / totalDuration) * 100),
      );

      if (typeof reportVideoProgress === "function" && videoId) {
        reportVideoProgress(videoId, {
          current_position_seconds: Math.floor(currentTime),

          watched_duration_seconds: Math.floor(currentTime),

          completion_percentage: completionPercentage,
        });
      }
    }
  }, [currentTime, totalDuration, userRole, videoId, reportVideoProgress]);

  // ============================================================
  // PLAY / PAUSE
  // ============================================================

  const handlePlayPause = () => {
    if (!playerRef.current) {
      return;
    }

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // ============================================================
  // SEEK
  // ============================================================

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);

    setCurrentTime(seekTime);

    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(seekTime, true);
    }
  };

  // ============================================================
  // VOLUME
  // ============================================================

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);

    setVolume(val);

    if (
      playerRef.current &&
      typeof playerRef.current.setVolume === "function"
    ) {
      playerRef.current.setVolume(val);

      if (val === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  // ============================================================
  // MUTE / UNMUTE
  // ============================================================

  const handleToggleMute = () => {
    if (!playerRef.current) {
      return;
    }

    if (isMuted) {
      playerRef.current.unMute();

      playerRef.current.setVolume(volume || 80);

      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  // ============================================================
  // PLAYBACK SPEED
  // ============================================================

  const handleSpeedChange = () => {
    if (
      !playerRef.current ||
      typeof playerRef.current.setPlaybackRate !== "function"
    ) {
      return;
    }

    const rates = [1, 1.25, 1.5, 2];

    const currentIndex = rates.indexOf(playbackRate);

    const nextRate = rates[(currentIndex + 1) % rates.length];

    playerRef.current.setPlaybackRate(nextRate);

    setPlaybackRate(nextRate);
  };

  // ============================================================
  // FULLSCREEN
  // ============================================================

  const handleToggleFullscreen = () => {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen?.()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch(() => {});
    }
  };

  // ============================================================
  // MOUSE CONTROLS
  // ============================================================

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      ref={containerRef}
      className="protected-player-root"
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={handleMouseMove}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: "var(--radius-lg, 16px)",
        overflow: "hidden",
        background: "#040711",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* =====================================================
          VIDEO POSTER
          ===================================================== */}

      {!hasStarted ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            cursor: "pointer",
          }}
          onClick={() => setHasStarted(true)}
        >
          {/* Thumbnail */}

          <img
            src={thumbnail || "/teacher.png"}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.55)",
            }}
          />

          {/* Overlay */}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at center, rgba(79, 70, 229, 0.2) 0%, rgba(4, 7, 17, 0.88) 100%)",
            }}
          />

          {/* Secure Badge */}

          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(4, 7, 17, 0.9)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "0.75rem",
              color: "#38bdf8",
              fontWeight: 800,
              boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
            }}
          >
            <Lock size={13} />

            <span>مشاهدة مشفرة ومحمية داخل المنصة فقط</span>
          </div>

          {/* Center Play */}

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => setHasStarted(true)}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 40px rgba(6, 182, 212, 0.65)",
                border: "2px solid rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                transition: "transform 0.2s ease",
              }}
              title="انقر لبدء المشاهدة المشفرة"
            >
              <Play
                size={36}
                style={{
                  marginLeft: "4px",
                  fill: "currentColor",
                }}
              />
            </button>

            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#ffffff",
                marginTop: "16px",
              }}
            >
              {title}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "rgba(0,0,0,0.75)",
                  padding: "5px 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                انقر لبدء المشاهدة
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================
           ACTIVE PROTECTED PLAYER
           ===================================================== */

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#000",
          }}
        >
          {/* =================================================
              YOUTUBE IFRAME
              ================================================= */}

          <div
            ref={iframeContainerRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <div
              id={playerId}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          </div>

          {/* =================================================
              INTERACTIVE SURFACE
              ================================================= */}

          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              cursor: "pointer",
              background: "transparent",
            }}
            onClick={handlePlayPause}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* =================================================
              MOVING WATERMARK
              ================================================= */}

          <div
            style={{
              position: "absolute",
              top: `${watermarkPos.top}%`,
              left: `${watermarkPos.left}%`,
              zIndex: 25,
              pointerEvents: "none",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(3px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "0.68rem",
              color: "rgba(255, 255, 255, 0.65)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 2s ease-in-out",
              userSelect: "none",
            }}
          >
            <ShieldCheck
              size={12}
              style={{
                color: "var(--cyan, #06b6d4)",
              }}
            />

            <span>
              {student?.name ||
                (student?.first_name
                  ? `${student.first_name} ${student.last_name || ""}`.trim()
                  : "طالب")}
            </span>

            <span>•</span>

            <span>
              {student?.phone ||
                (typeof student?.subscription_code === "string"
                  ? student.subscription_code
                  : student?.subscription_code?.code ||
                    student?.subscription?.code ||
                    "")}
            </span>

            <span
              style={{
                fontSize: "0.6rem",
                color: "#94a3b8",
              }}
            >
              [محمي]
            </span>
          </div>

          {/* =================================================
              TOP HEADER
              ================================================= */}

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "52px",
              zIndex: 30,
              pointerEvents: "auto",
              background:
                "linear-gradient(180deg, rgba(4, 7, 17, 0.95) 0%, rgba(4, 7, 17, 0.6) 60%, transparent 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              opacity: showControls ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: "rgba(79, 70, 229, 0.4)",
                  color: "#38bdf8",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                <Lock size={12} />

                <span>مشغل المنصة الآمن</span>
              </span>

              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  maxWidth: "320px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(0,0,0,0.5)",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                👨‍🏫 مستر محمد عبد الخالق
              </span>
            </div>
          </div>

          {/* =================================================
              BOTTOM CONTROLS
              ================================================= */}

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              pointerEvents: "auto",
              background:
                "linear-gradient(0deg, rgba(4, 7, 17, 0.98) 0%, rgba(4, 7, 17, 0.75) 70%, transparent 100%)",
              padding: "12px 16px 10px",
              opacity: showControls ? 1 : 0,
              transition: "opacity 0.3s ease",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* =================================================
                PROGRESS BAR
                ================================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="range"
                min={0}
                max={totalDuration || 100}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  height: "5px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  accentColor: "#06b6d4",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
            </div>

            {/* =================================================
                BOTTOM ROW
                ================================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#fff",
              }}
            >
              {/* LEFT CONTROLS */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {/* PLAY / PAUSE */}

                <button
                  onClick={handlePlayPause}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    borderRadius: "6px",
                  }}
                  title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* VOLUME */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <button
                    onClick={handleToggleMute}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                    title={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="protected-player-volume-slider"
                    style={{
                      width: "65px",
                      height: "4px",
                      accentColor: "#38bdf8",
                      cursor: "pointer",
                    }}
                  />
                </div>

                {/* TIME */}

                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#cbd5e1",
                    direction: "ltr",
                    fontWeight: 600,
                  }}
                >
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>

              {/* RIGHT CONTROLS */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {/* SPEED */}

                <button
                  onClick={handleSpeedChange}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#38bdf8",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  title="تغيير سرعة الفيديو"
                >
                  {playbackRate}x
                </button>

                {/* FULLSCREEN */}

                <button
                  onClick={handleToggleFullscreen}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                  }}
                  title="ملء الشاشة"
                >
                  {isFullscreen ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(seconds) {
  if (Number.isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const mins = Math.floor(seconds / 60);

  const secs = Math.floor(seconds % 60);

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Lock, Map as MapIcon } from "lucide-react";
import { logSystem, onSystem, systemLines } from "@/game/syslog";
import { BAG_MAX, CATALOG, HEROES, bonusOf, formatPlus, isBoundItem, itemDef, yetiUnlocked, type BossId } from "@/game/balance";
import { MAIN_QUESTS, monsterName, questBlurb, questMonster, questNeed, questReady, questReward } from "@/game/quests";
import { MOUNTS, SKIN_ROLLS, projectileCredits } from "@/game/mounts";
import { startTitleMusic, stopTitleMusic, unlockAudio } from "@/game/audio";
import { Game, preloadBlocks, preloadMap, preloadPortals, preloadScenery, type HudSnap } from "@/game/engine";
import { MAPS, REALM_ORDER, WORLD_LABELS } from "@/game/maps";
import { drawActor, drawYetiHero, heroFrame, loadAtlas, onHeroes, onJot, preloadAsg, preloadBossArt, preloadHeroes, preloadJot, preloadNid, preloadNifl, preloadVan, type Atlas } from "@/game/sprites";
import type { HeroId, ItemInst, StatKey } from "@/game/types";
import { authClient, rememberAuthResponse, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  buyListing,
  cancelDelete,
  chatSync,
  claimBoss,
  unlockDoor,
  claimDrop,
  arenaBoard,
  arenaCreate,
  arenaJoin,
  arenaReady,
  arenaLeave,
  arenaEnd,
  createHero,
  hitPlayer,
  listHeroes,
  listMarket,
  loadHero,
  placeDrop,
  postListing,
  pulse,
  reportCityKill,
  revivePlayer,
  saveHero,
  scheduleDelete,
  socialSync,
  partyCreate,
  partyInvite,
  partyAnswer,
  partyKick,
  partyLead,
  partyLeave,
  grantPartyExp,
  guildCreate,
  guildJoin,
  guildLeave,
  guildPoint,
  tradeConfirm,
  tradeOffer,
  tradeOpen,
  tradeRead,
} from "@/lib/midgard/api";
import type { ChatLine, HeroCard, HeroRecord, Listing, TradeView } from "@/lib/midgard/types";

type Phase = "title" | "auth" | "roster" | "create" | "play" | "reset";
type Modal =
  | null
  | { kind: "shop"; shop: string; label: string }
  | { kind: "gate"; label: string }
  | { kind: "trade"; peerId: string; name: string }
  | { kind: "downed" }
  | { kind: "world" }
  | { kind: "mimir" }
  | { kind: "fenrir" };

type SocialSnap = {
  party: { id: string; leaderId: string; members: { id: string; name: string }[] } | null;
  invites: { id: string; fromName: string; partyId: string }[];
  guilds: { id: string; name: string; members: number; points: number }[];
  mine: { id: string; name: string; leaderId: string; points: number; members: { id: string; name: string }[] } | null;
  pendingExp?: number;
};

const STATS: { key: StatKey; label: string; hint: string }[] = [
  { key: "str", label: "Str", hint: "Stomp and shot damage" },
  { key: "agi", label: "Agi", hint: "Throw speed. Extra, lower, faster stomps after the first." },
  { key: "vit", label: "Vit", hint: "Defense and max HP" },
  { key: "int", label: "Int", hint: "Max SP" },
  { key: "dex", label: "Dex", hint: "Jump height" },
  { key: "luck", label: "Luck", hint: "Crit chance, pink numbers" },
];

const emptySnap: HudSnap = {
  name: "",
  hero: "hermy",
  level: 1,
  exp: 0,
  next: 1,
  points: 0,
  hp: 1,
  maxHp: 1,
  sp: 1,
  maxSp: 1,
  gold: 0,
  criminal: false,
  stance: "peace",
  mapId: "midgard",
  mapName: "Midgard",
  weapon: "Fists",
  potions: 0,
  near: null,
  shop: null,
  gate: null,
  peerId: null,
  toast: "",
  jailedUntil: 0,
  bossName: "",
  bossHp: 0,
  bossMax: 1,
  boss2Name: "",
  boss2Hp: 0,
  boss2Max: 1,
  paused: false,
};

export function MidgardApp() {
  const { user, isPending } = useCurrentUserState();
  const [phase, setPhase] = useState<Phase>("title");
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [bootError, setBootError] = useState("");
  const [record, setRecord] = useState<HeroRecord | null>(null);
  const [roster, setRoster] = useState<HeroCard[]>([]);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    startTitleMusic();
    let dead = false;
    loadAtlas()
      .then((next) => {
        if (dead) return;
        setAtlas(next);
      })
      .catch(() => {
        if (!dead) setBootError("The sprite atlas failed to load.");
      });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setResetToken(token);
      setPhase("reset");
    } else if (params.get("error") === "INVALID_TOKEN") {
      setResetToken("");
      setPhase("reset");
    }
  }, []);

  const [gateNote, setGateNote] = useState("");

  async function openRoster() {
    const list = await listHeroes();
    setRoster(list);
    setRecord(null);
    setPhase(list.length ? "roster" : "create");
  }

  async function continueAsHero() {
    unlockAudio();
    setGateNote("");
    let last = "The gate did not open. Try the login again.";
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await openRoster();
        return;
      } catch (err) {
        last = err instanceof Error && err.message ? err.message : last;
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
    }
    setGateNote(last);
    setPhase("auth");
  }

  async function begin() {
    if (isPending) return;
    setPhase("auth");
  }

  return (
    <div className="fixed inset-0 bg-ink text-parchment">
      {phase === "play" && atlas && record && user ? (
        <PlayField
          atlas={atlas}
          record={record}
          onRoster={() => {
            void openRoster();
          }}
        />
      ) : (
        <TitleStage
          atlas={atlas}
          phase={phase}
          bootError={bootError}
          gateNote={gateNote}
          pending={isPending}
          onBegin={() => void begin()}
          onAuthed={() => void continueAsHero()}
          onCreated={(hero) => {
            setRecord(hero);
            setPhase("play");
          }}
          rosterCount={roster.length}
          roster={roster}
          onBack={() => setPhase("roster")}
          onPlay={(id) => {
            void loadHero({ data: { characterId: id } }).then((hero) => {
              if ("error" in hero) return;
              setRecord(hero);
              setPhase("play");
            });
          }}
          onCreate={() => setPhase("create")}
          onChanged={() => void openRoster()}
          resetToken={resetToken}
          onResetDone={() => {
            window.history.replaceState(null, "", window.location.pathname);
            setResetToken("");
            setPhase("auth");
          }}
        />
      )}
    </div>
  );
}

function TitleStage({
  atlas,
  phase,
  bootError,
  gateNote,
  pending,
  onBegin,
  onAuthed,
  onCreated,
  rosterCount,
  roster,
  onBack,
  onPlay,
  onCreate,
  onChanged,
  resetToken,
  onResetDone,
}: {
  atlas: Atlas | null;
  phase: Phase;
  bootError: string;
  gateNote: string;
  pending: boolean;
  onBegin: () => void;
  onAuthed: () => void;
  onCreated: (hero: HeroRecord) => void;
  rosterCount: number;
  roster: HeroCard[];
  onBack: () => void;
  onPlay: (id: string) => void;
  onCreate: () => void;
  onChanged: () => void;
  resetToken: string;
  onResetDone: () => void;
}) {
  useEffect(() => {
    startTitleMusic();
    return () => stopTitleMusic();
  }, []);
  return (
    <div className="relative flex h-full w-full flex-col bg-ink" onPointerDown={() => startTitleMusic()}>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <img
          src="/assets/maps/title.jpg"
          alt="Hermy and Champo's Norse Adventure"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="flex max-h-[62vh] w-full shrink-0 flex-col items-center overflow-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        {bootError ? <p className="card mb-4 px-4 py-2 text-crimson">{bootError}</p> : null}
        {phase === "title" ? (
          <>
            <p className="mb-2 text-center text-sm font-extrabold text-parchment">Free Open Beta testing No $5 subscription fee.</p>
            <p className="mb-2 text-center text-sm font-extrabold tracking-wide text-parchment">Please Wait</p>
            <button type="button" className="btn mb-2 pointer-events-none opacity-40" disabled>
              Pay $5   One Time Fee For 30 Days Access
            </button>
            <button type="button" className="btn mb-2 pointer-events-none opacity-40" disabled>
              Pay $5 Monthly Subscription
            </button>
            <button type="button" className="btn" onClick={onBegin} disabled={!atlas || pending}>
              {atlas ? "Begin Your Adventure" : "Waking the world…"}
            </button>
            <p className="mt-4 text-center text-sm tracking-wide text-parchment/90">Hermit Life Games © 2006</p>
            <button
              type="button"
              disabled
              className="pointer-events-none absolute bottom-1 right-1 z-20 rounded border border-parchment/40 px-2 py-1 text-[10px] text-parchment opacity-40"
            >
              Cancel Subscription
            </button>
          </>
        ) : null}
        {phase === "auth" ? (
          <div className="w-full max-w-sm">
            {gateNote ? <p className="mb-2 text-center text-sm text-crimson">{gateNote}</p> : null}
            <AuthCard onReady={onAuthed} />
          </div>
        ) : null}
        {phase === "create" && atlas ? (
          <CreateHero atlas={atlas} maxReborn={Math.max(0, ...roster.map((hero) => hero.reborn ?? 0))} onCreated={onCreated} canBack={rosterCount > 0} onBack={onBack} />
        ) : null}
        {phase === "roster" && atlas ? (
          <Roster atlas={atlas} heroes={roster} onPlay={onPlay} onCreate={onCreate} onChanged={onChanged} />
        ) : null}
        {phase === "reset" ? <ResetPassword token={resetToken} onDone={onResetDone} /> : null}
      </div>
    </div>
  );
}

export function AuthCard({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<"create" | "login">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotNote, setForgotNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || !email.includes(".")) {
      setError("Use an email, like hero@midgard.com.");
      return;
    }
    if (password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const name = email.split("@")[0] || "Adventurer";
    const fetchOptions = { onSuccess: (ctx: { response: Response }) => rememberAuthResponse(ctx.response) };
    const result =
      mode === "create"
        ? await authClient.signUp.email({ email, password, name, fetchOptions })
        : await authClient.signIn.email({ email, password, fetchOptions });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "The gate stayed shut.");
      return;
    }
    try {
      await authClient.getSession();
    } catch {
      /* the session store still has the sign-in response */
    }
    onReady();
  }

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => void submit(e)}>
      <h1 className="font-display text-xl text-gold">{mode === "create" ? "Create an account" : "Welcome back"}</h1>
      <p className="text-sm">Any email works. No verification letter will come.</p>
      <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className="field"
        type="password"
        autoComplete={mode === "create" ? "new-password" : "current-password"}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-crimson">{error}</p> : null}
      <button className="btn w-full" type="submit" disabled={busy}>
        {busy ? "One moment…" : mode === "create" ? "Create account" : "Login"}
      </button>
      {mode === "login" ? (
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            void (async () => {
              setBusy(true);
              setError("");
              setForgotNote("");
              if (!email.includes("@")) {
                setError("Enter the email on the account.");
                setBusy(false);
                return;
              }
              try {
                const res = await fetch("/api/auth/request-password-reset", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email, redirectTo: window.location.origin + "/" }),
                });
                if (!res.ok) {
                  setError("The letter could not be sent. Try again.");
                  return;
                }
                setForgotNote("If that account exists, a link to change the password is in the mail.");
              } catch {
                setError("The letter could not be sent. Try again.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Forgot password?
        </button>
      ) : null}
      {forgotNote ? <p className="text-sm text-gold">{forgotNote}</p> : null}
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => {
          setMode(mode === "create" ? "login" : "create");
          setError("");
          setForgotNote("");
        }}
      >
        {mode === "create" ? "I already have an account" : "I need a new account"}
      </button>
    </form>
  );
}

function CreateHero({
  atlas,
  maxReborn,
  onCreated,
  canBack,
  onBack,
}: {
  atlas: Atlas;
  maxReborn: number;
  onCreated: (hero: HeroRecord) => void;
  canBack: boolean;
  onBack: () => void;
}) {
  const [hero, setHero] = useState<HeroId>("hermy");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const yetiOpen = yetiUnlocked(maxReborn);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (hero === "yeti" && !yetiOpen) {
      setError("Baby Yeti unlocks after 10 reborns.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await createHero({ data: { name, hero } });
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(result);
  }

  return (
    <form className="card w-full max-w-md space-y-3 p-4" onSubmit={(e) => void submit(e)}>
      <h1 className="font-display text-xl text-gold">Choose your hero</h1>
      <div className="grid grid-cols-2 gap-2">
        {HEROES.map((entry) => {
          const locked = entry.id === "yeti" && !yetiOpen;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={locked}
              onClick={() => {
                if (locked) {
                  setError("Baby Yeti unlocks after 10 reborns.");
                  return;
                }
                setHero(entry.id);
                setError("");
              }}
              className={`rounded-lg border p-2 text-left ${hero === entry.id ? "border-gold bg-ink" : "border-transparent bg-ink/40"} ${locked ? "opacity-80" : ""}`}
            >
              <Portrait atlas={atlas} hero={entry.id} silhouette={locked} />
              <span className="mt-1 block font-display text-parchment">{entry.name}</span>
              <span className="block text-xs">{locked ? "Locked until 10 reborns." : entry.blurb}</span>
            </button>
          );
        })}
      </div>
      <input className="field" maxLength={16} placeholder="Unique name" value={name} onChange={(e) => setName(e.target.value)} />
      {error ? <p className="text-sm text-crimson">{error}</p> : null}
      <button className="btn w-full" type="submit" disabled={busy}>
        {busy ? "Inscribing…" : "Take this name"}
      </button>
      {canBack ? (
        <button type="button" className="btn-ghost w-full" onClick={onBack}>
          Back to heroes
        </button>
      ) : null}
    </form>
  );
}

function Portrait({ atlas, hero, silhouette }: { atlas: Atlas; hero: string; silhouette?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    preloadHeroes();
    preloadJot();
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (hero === "yeti") drawYetiHero(ctx, 1, 1, canvas.width / 2, canvas.height - 6, 150);
      else drawActor(ctx, atlas, heroFrame(hero, "walk", 1, 1), canvas.width / 2, canvas.height - 6, 150);
      if (silhouette) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "#140e08";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
      }
    };
    paint();
    const stopHeroes = onHeroes(paint);
    const stopJot = onJot(paint);
    return () => {
      stopHeroes();
      stopJot();
    };
  }, [atlas, hero, silhouette]);
  return <canvas ref={ref} width={160} height={170} className="mx-auto h-28 w-24" />;
}

function PlayField({ atlas, record, onRoster }: { atlas: Atlas; record: HeroRecord; onRoster: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const hpRef = useRef<HTMLDivElement>(null);
  const spRef = useRef<HTMLDivElement>(null);
  const expRef = useRef<HTMLDivElement>(null);
  const hpText = useRef<HTMLSpanElement>(null);
  const spText = useRef<HTMLSpanElement>(null);
  const expText = useRef<HTMLSpanElement>(null);
  const bossHud = useRef<HTMLDivElement>(null);
  const bossFill = useRef<HTMLDivElement>(null);
  const bossText = useRef<HTMLSpanElement>(null);
  const bossLabel = useRef<HTMLParagraphElement>(null);
  const boss2Label = useRef<HTMLParagraphElement>(null);
  const boss2Track = useRef<HTMLDivElement>(null);
  const boss2Fill = useRef<HTMLDivElement>(null);
  const boss2Text = useRef<HTMLSpanElement>(null);
  const pads = usePads(gameRef);
  const rev = useRef(record.revision);
  const dirty = useRef(false);
  const saving = useRef(false);
  const [snap, setSnap] = useState<HudSnap>(emptySnap);
  const [story, setStory] = useState("");
  const [fenrirDeny, setFenrirDeny] = useState(false);
  const [panel, setPanel] = useState<null | "bag" | "gear" | "stats" | "info" | "mount" | "party" | "guild" | "skins" | "quest">(null);
  const [compact, setCompact] = useState(false);
  const [bagTab, setBagTab] = useState<"all" | "gear" | "potions" | "gems" | "weapons" | "cards" | "mounts">("all");
  const [modal, setModal] = useState<Modal>(null);
  const [note, setNote] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [trade, setTrade] = useState<TradeView | null>(null);
  const [price, setPrice] = useState("100");
  const [offerGold, setOfferGold] = useState("0");
  const [offerUids, setOfferUids] = useState<string[]>([]);
  const [social, setSocial] = useState<SocialSnap | null>(null);
  const [socialNote, setSocialNote] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [guildDraft, setGuildDraft] = useState("");
  const [seeMount, setSeeMount] = useState<string | null>(null);
  const [showSkins, setShowSkins] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const appliedTrade = useRef("");
  const flushRef = useRef<() => Promise<boolean>>(async () => false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, atlas, structuredClone(record.state), {
      onDeathDrop: (drop) => {
        void placeDrop({ data: { characterId: record.id, map: game.map.id, x: drop.x, y: drop.y, gold: drop.gold, items: drop.items, kind: drop.kind } })
          .then((made) => {
            if (drop.localId) game.adoptDrop(drop.localId, made);
            else game.addServerDrop(made);
          })
          .catch(() => game.toastMsg("The ground refused the drop."));
      },
      onVoidDrop: (id) => {
        void claimDrop({ data: { characterId: record.id, id } }).then(() => game.consumeDrop(id));
      },
      onBossKill: (boss, x, y, damage) => {
        void claimBoss({ data: { characterId: record.id, boss, map: game.map.id, x, y, damage } })
          .then((res) => {
            if (res.ok) {
              for (const drop of res.drops) game.addServerDrop(drop);
              game.crown(res.winnerId);
              if (res.youWon) {
                game.toastMsg("1st Place. Boss loot is yours for 30 seconds. Press Talk/Go on it.");
                logSystem("1st Place. The boss loot is yours for 30 seconds.");
              } else {
                game.toastMsg("Another hero did more damage. Their loot is locked for 30 seconds.");
                logSystem("You were not 1st Place. The loot belongs to them for 30 seconds.");
              }
            } else {
              game.locallyDown.delete(boss);
              game.bossUp[boss] = true;
              game.reconcileBosses();
              game.toastMsg(res.error);
            }
          })
          .catch(() => game.toastMsg("The loot could not be claimed."));
      },
      onUnlock: (door) => {
        void unlockDoor({ data: { door } });
      },
      onArenaDeath: (info) => {
        void arenaEnd({ data: { characterId: record.id, mode: info.mode, attackerId: info.attackerId } });
      },
      onStory: (id) => {
        if (id === "dwarf") {
          setStory("Here is a secret door to the Most Evil Dwarf of all. Enter if You Dare. You may find something rare. Be warned, for what he wears is Corrupt with Evil.");
        }
        if (id === "valkyrie") {
          setStory("Brave warrior, you have proven yourself and we need your help to retrieve an item of Legends, a Lost Treasure stolen by the Evil Baphomet! He has come here through a Demonic Portal from a far away Realm of the Future. He has made Hel his Home. Please help us get the Celestial Boomerang back!");
        }
      },
      onPvp: (peerId, amount) => {
        void hitPlayer({ data: { characterId: record.id, victimId: peerId, amount } });
      },
      onRevive: (peerId) => {
        void revivePlayer({ data: { characterId: record.id, victimId: peerId } });
      },
      onDied: (info) => {
        void reportCityKill({ data: { characterId: record.id, attackerId: info.attackerId, victimCriminal: game.state.criminal } });
      },
      onBranded: () => game.toastMsg("Your name burns red. You are a Criminal."),
      onChange: () => {
        dirty.current = true;
      },
      onPersist: () => {
        dirty.current = true;
        void flushRef.current();
      },
      onPartyExp: (share) => {
        void grantPartyExp({ data: { characterId: record.id, share } });
      },
      onGuildPoint: () => {
        void guildPoint({ data: { characterId: record.id } });
      },
    });
    game.myId = record.id;
    game.onPickup = (drop) => {
      void claimDrop({ data: { characterId: record.id, id: drop.id } }).then((res) => {
        if (!gameRef.current) return;
        if (res.ok) {
          const leftover = game.giveItems(res.items, res.gold);
          game.consumeDrop(drop.id);
          if (leftover.length) {
            void placeDrop({ data: { characterId: record.id, map: game.map.id, x: game.state.x, y: game.state.y, gold: 0, items: leftover } }).then((made) =>
              game.addServerDrop(made),
            );
            game.toastMsg("Bag full. The rest stays down.");
          }
        } else {
          game.pendingPickup.delete(drop.id);
          game.toastMsg(res.error);
        }
      });
    };
    for (const map of Object.values(MAPS)) if (map.bg) preloadMap(map.bg);
    preloadPortals();
    preloadBlocks();
    preloadNid();
    preloadJot();
    preloadVan();
    preloadNifl();
    preloadAsg();
    preloadBossArt();
    preloadHeroes();
    preloadScenery();
    game.start();
    const onView = () => game.resize();
    window.visualViewport?.addEventListener("resize", onView);
    window.addEventListener("focusout", onView);
    game.toastMsg("A/D move · Space jump · Shift runs · Talk/Go for shops and portals");
    gameRef.current = game;
    const paint = window.setInterval(() => setSnap(game.snapshot()), 200);
    let frame = 0;
    const drawHud = () => {
      frame = requestAnimationFrame(drawHud);
      const live = game.snapshot();
      if (hpRef.current) hpRef.current.style.transform = `scaleX(${live.maxHp ? live.hp / live.maxHp : 0})`;
      if (spRef.current) spRef.current.style.transform = `scaleX(${live.maxSp ? live.sp / live.maxSp : 0})`;
      const expPct = live.next > 0 ? Math.max(0, Math.min(1, live.exp / live.next)) : 0;
      if (expRef.current) expRef.current.style.transform = `scaleX(${expPct})`;
      if (hpText.current) hpText.current.textContent = `${Math.ceil(live.hp)}/${live.maxHp}`;
      if (spText.current) spText.current.textContent = `${Math.ceil(live.sp)}/${live.maxSp}`;
      if (expText.current) expText.current.textContent = `${Math.floor(expPct * 100)}%`;
      if (bossHud.current) bossHud.current.style.display = live.bossName ? "block" : "none";
      if (bossLabel.current) bossLabel.current.textContent = live.bossName;
      if (bossFill.current) bossFill.current.style.transform = `scaleX(${live.bossMax ? Math.max(0, live.bossHp) / live.bossMax : 0})`;
      if (bossText.current) bossText.current.textContent = `${Math.max(0, Math.ceil(live.bossHp))}/${live.bossMax}`;
      if (boss2Label.current) {
        boss2Label.current.style.display = live.boss2Name ? "block" : "none";
        boss2Label.current.textContent = live.boss2Name;
      }
      if (boss2Track.current) boss2Track.current.style.display = live.boss2Name ? "block" : "none";
      if (boss2Fill.current) boss2Fill.current.style.transform = `scaleX(${live.boss2Max ? Math.max(0, live.boss2Hp) / live.boss2Max : 0})`;
      if (boss2Text.current) boss2Text.current.textContent = live.boss2Name ? `${Math.max(0, Math.ceil(live.boss2Hp))}/${live.boss2Max}` : "";
      if (game.dismissModal) {
        game.dismissModal = false;
        game.setPaused(false);
        setModal(null);
      }
      if (game.openRequest) {
        const request = game.openRequest;
        game.openRequest = null;
        setModal((current) => {
          if (request === "downed") {
            return { kind: "downed" };
          }
          if (current) return current;
          game.setPaused(true);
          if (request === "shop" && game.nearShop) return { kind: "shop", shop: game.nearShop, label: game.nearLabel ?? "Shop" };
          if (request === "mimir") return { kind: "mimir" };
          if (request === "fenrir") {
            setFenrirDeny(false);
            return { kind: "fenrir" };
          }
          if (request === "gate") return { kind: "gate", label: game.nearLabel ?? "Leave" };
          if (request === "peer" && game.nearPeer) {
            const peer = game.peers.find((entry) => entry.id === game.nearPeer);
            return { kind: "trade", peerId: game.nearPeer, name: peer?.name ?? "Traveler" };
          }
          game.setPaused(false);
          return current;
        });
      }
    };
    frame = requestAnimationFrame(drawHud);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(paint);
      window.visualViewport?.removeEventListener("resize", onView);
      window.removeEventListener("focusout", onView);
      game.stop();
      gameRef.current = null;
    };
  }, [atlas, record]);

  useEffect(() => {
    flushRef.current = async () => {
      const game = gameRef.current;
      if (!game || saving.current) return false;
      saving.current = true;
      try {
        const res = await saveHero({
          data: { characterId: record.id, revision: rev.current, state: game.state, pose: game.pose(), facing: game.facing },
        });
        if ("ok" in res && res.ok) {
          rev.current = res.revision;
          dirty.current = false;
          if (res.criminal && !game.state.criminal) game.markCriminal();
          return true;
        }
        if ("conflict" in res && res.conflict) {
          rev.current = res.revision;
          game.adoptEconomy(res.state);
          dirty.current = false;
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        saving.current = false;
      }
    };
  });

  useEffect(() => {
    let stop = false;
    let busy = false;
    async function poll() {
      const game = gameRef.current;
      if (!game || busy) return;
      busy = true;
      const mapId = game.map.id;
      try {
        const res = await pulse({
          data: {
            characterId: record.id,
            map: mapId,
            x: game.state.x,
            y: game.state.y,
            pose: game.pose(),
            facing: game.facing,
            boss: (game.map.boss ?? null) as BossId | null,
            bossHits: game.takeBossHurt(),
          },
        });
        if (stop || !gameRef.current) return;
        game.setPeers(res.peers);
        if (game.map.id === mapId) game.syncDrops(res.drops);
        if (!document.hidden && !game.paused && !game.away) {
          for (const hit of res.hits) game.sufferPvp(hit.amount, hit.attackerName, hit.attackerId);
        }
        for (const revive of res.revives) game.revive(revive.healerName);
        if (res.payoutGold > 0) {
          game.creditGold(res.payoutGold);
          game.toastMsg(`Trading post paid ${res.payoutGold} gold.`);
        }
        if (res.criminal && !game.state.criminal) game.markCriminal();
        game.syncBosses(res.bosses.map((row) => ({ id: row.id as BossId, up: row.up })));
        game.syncDoors(res.doors);
      } catch {
        /* the next pulse retries */
      } finally {
        busy = false;
      }
    }
    const pollId = window.setInterval(() => void poll(), 2000);
    const saveId = window.setInterval(() => {
      if (dirty.current) void flushRef.current();
    }, 8000);
    const persist = () => {
      if (dirty.current) void flushRef.current();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) persist();
    });
    void poll();
    return () => {
      stop = true;
      window.clearInterval(pollId);
      window.clearInterval(saveId);
      window.removeEventListener("pagehide", persist);
    };
  }, []);

  useEffect(() => {
    if (modal?.kind !== "shop" || modal.shop !== "auction") return;
    void listMarket().then(setListings).catch(() => setNote("The board is quiet."));
  }, [modal]);

  useEffect(() => {
    if (modal?.kind !== "trade") return;
    let stop = false;
    void tradeOpen({ data: { characterId: record.id, otherId: modal.peerId } }).then((view) => {
      if (!stop) setTrade(view);
    });
    const id = window.setInterval(() => {
      if (!trade?.id) return;
      void tradeRead({ data: { characterId: record.id, id: trade.id } }).then((view) => {
        if (stop) return;
        setTrade(view);
        if (view.phase === "done" && view.state && view.revision && appliedTrade.current !== view.id) {
          appliedTrade.current = view.id ?? "done";
          rev.current = view.revision;
          gameRef.current?.adoptEconomy(view.state);
          dirty.current = false;
        }
      });
    }, 1000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [modal, trade?.id]);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const res = await socialSync({ data: { characterId: record.id } });
        if (stop || !res || "error" in res) return;
        const live = gameRef.current;
        if (live) {
          live.partySize = Math.max(1, res.party?.members.length ?? 1);
          const points = res.mine?.points ?? 0;
          if ((live.state.guildBonus ?? 0) !== points) {
            live.state.guildBonus = points;
            dirty.current = true;
          }
          if (res.pendingExp) live.gainExp(res.pendingExp, true);
        }
        setSocial(res);
      } catch {
        /* next poll */
      }
    }
    void pull();
    const id = window.setInterval(() => void pull(), 4000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [record.id]);

  function closeModal() {
    setModal(null);
    setTrade(null);
    setNote("");
    gameRef.current?.setPaused(false);
  }

  function applyEconomy(next: { state: HeroRecord["state"]; revision: number }) {
    rev.current = next.revision;
    gameRef.current?.adoptEconomy(next.state);
    dirty.current = false;
    setSnap(gameRef.current?.snapshot() ?? emptySnap);
  }

  const game = gameRef.current;
  const quest = game?.state.quest ?? { step: 0, kills: 0, accepted: false, repeat: 0 };
  const questDone = Math.min(quest.step, MAIN_QUESTS);
  const questNum = quest.step >= MAIN_QUESTS ? MAIN_QUESTS : quest.step + 1;
  const questKind = questMonster(quest);
  const bag = game?.state.bag ?? [];
  const filtered = bag.filter((item) => {
    const def = itemDef(item.id);
    if (bagTab === "all") return true;
    if (bagTab === "potions") return def?.kind === "potion";
    if (bagTab === "gems") return def?.kind === "gem";
    if (bagTab === "weapons") return def?.kind === "weapon" && !!def.proj;
    if (bagTab === "cards") return def?.kind === "card";
    if (bagTab === "mounts") return def?.kind === "mount" || def?.kind === "skin";
    return def?.kind !== "potion" && def?.kind !== "gem" && def?.kind !== "relic";
  });

  return (
    <div className="relative h-full w-full touch-none select-none" onPointerDown={() => unlockAudio()}>
      <div className="absolute inset-x-0 top-0" style={{ bottom: "calc(16.5rem + max(0.35rem, env(safe-area-inset-bottom, 0px)))" }}>
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div ref={bossHud} className="boss-hud pointer-events-none" style={{ display: "none" }}>
        <p ref={bossLabel} className="boss-name" />
        <div className="bar boss-track">
          <div ref={bossFill} className="bar-fill bg-hp" />
          <span ref={bossText} className="boss-num" />
        </div>
        <p ref={boss2Label} className="boss-name" style={{ display: "none" }} />
        <div ref={boss2Track} className="bar boss-track" style={{ display: "none" }}>
          <div ref={boss2Fill} className="bar-fill bg-hp" />
          <span ref={boss2Text} className="boss-num" />
        </div>
      </div>
      {story ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink/55 p-3 sm:items-center">
          <div className="card w-full max-w-md space-y-3 p-4">
            <h2 className="font-display text-lg text-gold">Valkyrie</h2>
            <p className="text-sm">{story}</p>
            <button type="button" className="btn w-full" onClick={() => setStory("")}>
              I will help
            </button>
          </div>
        </div>
      ) : null}
      {social?.invites[0] ? (
        <div className="pointer-events-auto absolute left-1/2 top-24 z-40 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2">
          <div className="card space-y-2 p-3 text-sm">
            <p>{social.invites[0].fromName} invites you to their party.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn flex-1"
                onClick={() => {
                  const id = social.invites[0]?.id;
                  if (!id) return;
                  void partyAnswer({ data: { characterId: record.id, inviteId: id, yes: true } }).then(() =>
                    socialSync({ data: { characterId: record.id } }).then((res) => {
                      if (res && !("error" in res)) setSocial(res);
                    }),
                  );
                }}
              >
                Join
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  const id = social.invites[0]?.id;
                  if (!id) return;
                  void partyAnswer({ data: { characterId: record.id, inviteId: id, yes: false } }).then(() =>
                    setSocial((cur) => (cur ? { ...cur, invites: cur.invites.slice(1) } : cur)),
                  );
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className={`hud-corner pointer-events-auto absolute left-2 z-30 flex flex-col items-start gap-1 ${panel === "mount" || panel === "skins" ? "max-w-[calc(100vw-0.5rem)]" : "max-w-[calc(100vw-10.6rem)]"}`}>
          <div className="flex max-w-full items-start gap-1">
          <div className="card vitals min-w-0">
            {compact ? (
              <div className="space-y-0.5 text-[0.62rem] font-extrabold leading-tight">
                <p className="text-gold">Lv {snap.level}</p>
                <p className="text-hp">
                  {Math.ceil(snap.hp)}/{snap.maxHp} HP
                </p>
                <p className="text-sp">
                  {Math.ceil(snap.sp)}/{snap.maxSp} SP
                </p>
                <p className="text-gold">{snap.next > 0 ? Math.floor((snap.exp / snap.next) * 100) : 0}% EXP</p>
                <p className="text-gold">{snap.gold} gold</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={`truncate text-[0.7rem] font-extrabold ${snap.criminal ? "text-crimson" : "text-parchment"}`}>{snap.name || "Hero"}</span>
                  <span className="shrink-0 text-[0.6rem] font-extrabold text-gold">Lv {snap.level}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[0.58rem] font-extrabold">
                  <span className="w-6 text-hp">HP</span>
                  <div className="bar min-w-0 flex-1">
                    <div ref={hpRef} className="bar-fill bg-hp" />
                  </div>
                  <span ref={hpText} className="w-12 text-right text-hp">
                    {Math.ceil(snap.hp)}/{snap.maxHp}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[0.58rem] font-extrabold">
                  <span className="w-6 text-sp">SP</span>
                  <div className="bar min-w-0 flex-1">
                    <div ref={spRef} className="bar-fill bg-sp" />
                  </div>
                  <span ref={spText} className="w-12 text-right text-sp">
                    {Math.ceil(snap.sp)}/{snap.maxSp}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[0.58rem] font-extrabold">
                  <span className="w-6 text-gold">EXP</span>
                  <div className="bar min-w-0 flex-1">
                    <div ref={expRef} className="bar-fill bg-gold" />
                  </div>
                  <span ref={expText} className="w-12 text-right text-gold">
                    {snap.next > 0 ? Math.floor((snap.exp / snap.next) * 100) : 0}%
                  </span>
                </div>
                <p className="mt-0.5 text-[0.58rem] font-extrabold text-gold">{snap.gold} gold</p>
              </>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <button type="button" className="hud-mini" onClick={() => setCompact((value) => !value)}>
                {compact ? "Open" : "Min"}
              </button>
              {compact ? null : (
                <>
                  <button type="button" className={`hud-mini${panel === "info" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "info" ? null : "info"))}>
                    Info
                  </button>
                  <button type="button" className="hud-mini" onClick={() => gameRef.current?.nudgeZoom(1)}>
                    +
                  </button>
                  <button type="button" className="hud-mini" onClick={() => gameRef.current?.nudgeZoom(-1)}>
                    −
                  </button>
                  <button type="button" className={`hud-mini${panel === "quest" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "quest" ? null : "quest"))}>
                    Quest
                  </button>
                  <button type="button" className={`hud-mini${panel === "stats" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "stats" ? null : "stats"))}>
                    Stats
                  </button>
                  <button type="button" className={`hud-mini${panel === "guild" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "guild" ? null : "guild"))}>
                    Guild
                  </button>
                  <button type="button" className={`hud-mini${panel === "party" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "party" ? null : "party"))}>
                    Party
                  </button>
                  <button type="button" className={`hud-mini${panel === "mount" ? " on" : ""}`} onClick={() => setPanel((value) => (value === "mount" ? null : "mount"))}>
                    Mount
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <button type="button" className="bag-btn" style={{ width: "4.4rem" }} onClick={() => setPanel((value) => (value === "skins" ? null : "skins"))}>
              Mount Skin Shop
            </button>
          </div>
          </div>
        <div className={`hud-sheet pointer-events-auto flex max-w-full flex-col gap-1.5 ${panel === "mount" || panel === "skins" ? "wide w-[min(26rem,calc(100vw-0.5rem))]" : "w-[min(18rem,calc(100vw-1rem))]"}`}>
          {panel === "bag" ? (
            <div className="card max-h-[32vh] overflow-auto p-1.5">
              <div className="space-y-1 text-sm">
                <p className="text-[0.62rem] font-extrabold text-gold">{bag.length} / {BAG_MAX} spots</p>
                <div className="flex flex-wrap gap-1">
                  {([
                    ["all", "All"],
                    ["gear", "Gear"],
                    ["weapons", "Weapons"],
                    ["cards", "Cards"],
                    ["mounts", "Mounts"],
                    ["potions", "Potions"],
                    ["gems", "Gems"],
                  ] as const).map(([key, label]) => (
                    <button key={key} type="button" className={`hud-mini${bagTab === key ? " on" : ""}`} onClick={() => setBagTab(key)}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {filtered.map((item) => {
                    const def = itemDef(item.id);
                    const name = `${def?.name ?? item.id}${item.plus ? ` ${formatPlus(item.plus)}` : ""}`;
                    return (
                      <button key={item.uid} type="button" className="bag-cell" title={name} onClick={() => gameRef.current?.equipUid(item.uid)}>
                        <ItemFace id={item.id} compact />
                        <span className="w-full truncate">{name}</span>
                        <span className="flex items-center justify-center gap-0.5 text-[0.48rem] text-gold">
                          {item.qty && item.qty > 1 ? `x${item.qty}` : item.charges != null ? `${item.charges}/3` : ""}
                          <LockMark item={item} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!filtered.length ? <p className="text-xs">Empty.</p> : null}
                <p className="text-[0.58rem] leading-tight">Tap gear to equip. Tap a potion or Yggdrasil Branch to use it.</p>
              </div>
            </div>
          ) : null}
          {panel === "gear" && game ? (
            <div className="card max-h-[32vh] overflow-auto p-1.5">
              <div className="grid grid-cols-2 gap-1 text-[0.62rem]">
                {(
                  [
                    ["weapon", "Weapon"],
                    ["head", "Head"],
                    ["body", "Body"],
                    ["legs", "Legs"],
                    ["ring", "Ring"],
                    ["belt", "Belt"],
                    ["earring", "Earrings"],
                    ["bracelet", "Bracelet"],
                    ["neck", "Necklace"],
                    ["charm", "Charm"],
                    ["card", "Card"],
                    ["mount", "Mount"],
                    ...(game.state.equip.acc ? ([["acc", "Old charm"]] as const) : []),
                  ] as const
                ).map((entry) => {
                  const slot = entry[0];
                  const label = entry[1];
                  const worn = game.state.equip[slot];
                  const def = worn ? itemDef(worn.id) : undefined;
                  const bonus = def
                    ? [
                        def.power ? `Pow ${def.power}` : "",
                        def.def ? `Def ${def.def}` : "",
                        def.str ? `Str ${def.str}` : "",
                        def.agi ? `Agi ${def.agi}` : "",
                        def.vit ? `Vit ${def.vit}` : "",
                        def.int ? `Int ${def.int}` : "",
                        def.dex ? `Dex ${def.dex}` : "",
                        def.luck ? `Luck ${def.luck}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : "";
                  return (
                    <button key={slot} type="button" className="bag-cell" onClick={() => worn && game.unequip(slot)}>
                      <ItemFace id={worn?.id} compact />
                      <span className="text-gold">{label}</span>
                      <span className="flex w-full items-center justify-center truncate">
                        {def?.name ?? "Empty"}
                        <LockMark item={worn} />
                      </span>
                      {bonus ? <span className="w-full truncate opacity-75">{bonus}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {panel === "quest" ? (
            <div className="card max-h-[32vh] overflow-auto p-2 text-xs leading-snug">
              <p className="font-extrabold text-gold">Quest {questNum} of {MAIN_QUESTS}</p>
              <p>Completed {questDone} of {MAIN_QUESTS} for the Flaming Phoenix</p>
              <p>
                {monsterName(questKind)} killed {quest.kills} of {questNeed(quest)}
              </p>
              <p className="mt-1 opacity-80">{quest.accepted ? questBlurb(quest) : "Accept this hunt at City Hall."}</p>
            </div>
          ) : null}
          {panel === "stats" ? (
            <div className="card max-h-[46vh] overflow-auto p-3">
              <div className="space-y-1 text-sm">
                <p className="text-gold">{snap.points} points</p>
                {STATS.map((stat) => {
                  const bonus = game ? bonusOf(game.state, stat.key) : 0;
                  return (
                  <div key={stat.key} className="flex items-center justify-between gap-2">
                    <span>
                      {stat.label} {game?.state[stat.key] ?? 0}
                      <span className="ml-2 text-gold">+{bonus}</span>
                      <span className="block text-xs opacity-80">{stat.hint}</span>
                    </span>
                    <button type="button" className="btn-ghost" disabled={!snap.points} onClick={() => gameRef.current?.spend(stat.key)}>
                      +
                    </button>
                  </div>
                  );
                })}
                <p className="text-xs">The gold number is gear, cards, and guild points together. It is not the points you spend.</p>
                <p className="text-xs">
                  EXP {snap.exp}/{snap.next}
                </p>
              </div>
            </div>
          ) : null}
          {panel === "info" ? (
            <div className="card max-h-[46vh] overflow-auto p-3">
              <div className="space-y-2 text-sm">
                <p>
                  {snap.hero} · {snap.weapon}
                </p>
                <p>{snap.criminal ? "Title: Criminal" : "Title: Citizen"}</p>
                <p>Stance: {snap.stance}</p>
                <button type="button" className="btn-ghost" onClick={() => gameRef.current?.setStance(snap.stance === "peace" ? "lethal" : "peace")}>
                  {snap.stance === "peace" ? "Go lethal" : "Make peace"}
                </button>
                <p className="text-xs">Peace hits monsters only. Lethal hits players too. A city kill brands you, unless they were already a criminal.</p>
                <p className="text-xs">Hold Run and roll onto Jump for a running jump. Talk/Go opens a shop or steps through a portal.</p>
                <p className="text-xs">To climb, stand by a rope, chain, or vine. Hold up or down on the stick, then press Climb. Jump lets go.</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    void flushRef.current().finally(() => onRoster());
                  }}
                >
                  Return to character select screen
                </button>
                {!hasGateSessionMarker() ? (
                  <button type="button" className="btn-ghost" onClick={() => void signOut("/")}>
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {panel === "mount" && game ? (
            <MountSheet
              game={game}
              characterId={record.id}
              note={socialNote}
              setNote={setSocialNote}
              seeMount={seeMount}
              setSeeMount={setSeeMount}
              showSkins={showSkins}
              setShowSkins={setShowSkins}
              showCash={showCash}
              setShowCash={setShowCash}
              apply={applyEconomy}
            />
          ) : null}
          {panel === "party" ? (
            <PartySheet
              characterId={record.id}
              social={social}
              note={socialNote}
              setNote={setSocialNote}
              inviteName={inviteName}
              setInviteName={setInviteName}
              onRefresh={() => void socialSync({ data: { characterId: record.id } }).then((res) => { if (res && !("error" in res)) setSocial(res); })}
            />
          ) : null}
          {panel === "skins" && game ? (
            <div className="card max-h-[68vh] overflow-auto p-2 text-[0.68rem]">
              <p className="text-gold">Mount Skin Shop</p>
              <p className="text-[0.58rem] leading-tight">Skins bind and cannot be dropped. The only purchase is a Lucky Mount Skin Box for $20. Using a box grants two random skins from one shared roll.</p>
              <p className="text-[0.58rem]">Stripe is not connected yet, so nothing is charged.</p>
              <button type="button" className="btn w-full" onClick={() => setSocialNote(game.buySkinBox() || "Stripe is not connected. Nothing was charged. A Lucky Mount Skin Box is in your bag.")}>
                Buy Lucky Mount Skin Box · $20
              </button>
              {socialNote ? <p className="text-[0.58rem] text-gold">{socialNote}</p> : null}
              <div className="grid grid-cols-3 gap-1">
                {SKIN_ROLLS.map((skin) => (
                  <div key={skin.id} className="rounded-md border border-gold/30 p-1">
                    <img src={skin.art} alt={skin.name} className="mx-auto h-12 w-full object-contain" />
                    <p className="text-center text-[0.52rem] leading-tight">{skin.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {panel === "guild" ? (
            <GuildSheet
              characterId={record.id}
              social={social}
              note={socialNote}
              setNote={setSocialNote}
              guildDraft={guildDraft}
              setGuildDraft={setGuildDraft}
              onRefresh={() => void socialSync({ data: { characterId: record.id } }).then((res) => {
                if (!res || "error" in res) return;
                setSocial(res);
                const live = gameRef.current;
                if (live) live.state.guildBonus = res.mine?.points ?? 0;
              })}
            />
          ) : null}
        </div>
        </div>

        <div className="pointer-events-auto absolute right-2 z-30 flex gap-1" style={{ top: "max(8rem, calc(env(safe-area-inset-top, 0px) + 4.25rem))" }}>
          <button
            type="button"
            className="pad"
            onClick={() => {
              gameRef.current?.setPaused(true);
              setModal({ kind: "world" });
            }}
          >
            <MapIcon className="mx-auto" size={16} />
            Map
          </button>
        </div>

        <ChatDock
          characterId={record.id}
          bagCount={bag.length}
          onWorld={(line) => gameRef.current?.sayBubble(line.fromId, line.fromName, line.body)}
          onBag={() => setPanel((value) => (value === "bag" ? null : "bag"))}
          onGear={() => setPanel((value) => (value === "gear" ? null : "gear"))}
        />
        <div className="pointer-events-auto absolute left-3" style={{ bottom: "max(2.6rem, calc(env(safe-area-inset-bottom) + 1.8rem))" }}>
          <Joystick
            onChange={(x, y, active) => gameRef.current?.setStick(x, y, active)}
          />
        </div>
        <div className="pointer-events-auto absolute right-1 flex flex-col items-end gap-1" style={{ bottom: "max(0.35rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-end gap-1">
            <button type="button" className="pad pad-big" onPointerDown={(e) => { e.preventDefault(); gameRef.current?.press("climb"); }}>
              Climb
            </button>
            <div className="flex flex-col items-end gap-1">
              <button type="button" className="pad" onPointerDown={(e) => { e.preventDefault(); gameRef.current?.usePotion("both"); }}>
                HP/MP Pot
              </button>
              <button type="button" className="pad" onPointerDown={(e) => { e.preventDefault(); gameRef.current?.usePotion("sp"); }}>
                MP Pot
              </button>
              <button type="button" className="pad" onPointerDown={(e) => { e.preventDefault(); gameRef.current?.usePotion("hp"); }}>
                HP Pot
              </button>
              <Hold pads={pads} name="run" label="Run" className="run-bridge" />
            </div>
          </div>
          <div className="play-pads flex flex-col items-end gap-1">
            <div className="grid grid-cols-2 gap-1">
              <Hold pads={pads} name="throw" label="Throw" big />
              <Hold pads={pads} name="jump" label="Jump" big gold />
              <Hold pads={pads} name="block" label="Block" big />
              <button
                type="button"
                className="pad pad-talk"
                onPointerDown={(e) => {
                  e.preventDefault();
                  gameRef.current?.press("interact");
                }}
              >
                Talk/Go
              </button>
              <button
                type="button"
                className="pad pad-big text-[0.58rem] leading-tight"
                onPointerDown={(e) => {
                  e.preventDefault();
                  gameRef.current?.toggleMount();
                }}
              >
                {game?.state.mounted ? "Dismount" : "Mount"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal?.kind === "world" ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-ink">
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{ paddingTop: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 2.5rem))", paddingBottom: "1rem" }}
          >
            <div className="relative mx-auto w-full max-w-[36rem]" style={{ aspectRatio: "1 / 1" }}>
              <img src="/assets/maps/world.jpg" alt="" className="absolute inset-0 h-full w-full object-contain" />
              <span className="realm-label" style={{ left: "50%", top: "50%" }}>
                Midgard
              </span>
              {WORLD_LABELS.map((name, index) => {
                const angle = (-Math.PI / 2) + (index / WORLD_LABELS.length) * Math.PI * 2;
                const left = 50 + Math.cos(angle) * 34;
                const top = 50 + Math.sin(angle) * 32;
                return (
                  <span key={name} className="realm-label" style={{ left: `${left}%`, top: `${top}%` }}>
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
          <button type="button" className="btn m-3" onClick={closeModal}>
            Close
          </button>
        </div>
      ) : null}
      {modal?.kind === "downed" ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink/55 p-3 sm:items-center">
          <div className="card w-full max-w-md space-y-3 p-4">
            <h2 className="font-display text-lg text-gold">You have fallen</h2>
            <p className="text-sm">Your body stays here. Wait for someone with a Yggdrasil Branch, or respawn.</p>
            <button
              type="button"
              className="btn w-full"
              onClick={() => {
                gameRef.current?.finishDeath();
                closeModal();
              }}
            >
              {gameRef.current?.state.criminal ? "Respawn in jail" : "Respawn"}
            </button>
            <button type="button" className="btn-ghost w-full" onClick={closeModal}>
              Wait to be revived
            </button>
          </div>
        </div>
      ) : null}
      {modal && modal.kind !== "world" && modal.kind !== "downed" ? (
        <div
          className="absolute inset-0 z-[80] flex justify-center bg-ink/55 px-3"
          style={{
            paddingTop: "max(8.75rem, calc(env(safe-area-inset-top, 0px) + 5.75rem))",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            touchAction: "auto",
          }}
        >
          <div className="card flex w-full max-w-md flex-col overflow-hidden" style={{ maxHeight: "100%", touchAction: "auto" }}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/40 bg-veil px-4 py-3">
              <h2 className="min-w-0 font-display text-lg text-gold">
                {modal.kind === "shop" ? modal.label : modal.kind === "gate" ? modal.label : modal.kind === "mimir" ? "Mimir" : modal.kind === "fenrir" ? "Wolf Door" : `Trade ${modal.name}`}
              </h2>
              <button type="button" className="btn shrink-0" onClick={closeModal}>
                Close
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
              style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
              onTouchMove={(event) => event.stopPropagation()}
            >
            {note ? <p className="mb-2 text-sm text-crimson">{note}</p> : null}
            {modal.kind === "mimir" ? (
              <div className="space-y-3">
                <p>Who wakes me from my Soothing Slumber.</p>
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    gameRef.current?.wakeMimir();
                    closeModal();
                  }}
                >
                  I Do!!!
                </button>
              </div>
            ) : null}
            {modal.kind === "fenrir" ? (
              <div className="space-y-3">
                <p>There are 7 locks that need 7 different keys in your bag to open. There Must be Something Extremely Dangerous behind this Door….You Hear Growling and Snarling…</p>
                {fenrirDeny ? <p className="text-crimson">You do not have all the keys.</p> : null}
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    if (gameRef.current?.tryFenrir()) closeModal();
                    else setFenrirDeny(true);
                  }}
                >
                  Enter
                </button>
                <button type="button" className="btn-ghost w-full" onClick={closeModal}>
                  Back
                </button>
              </div>
            ) : null}
            {modal.kind === "gate" ? (
              <div className="space-y-3">
                <p>The road does not check your level. You can walk in too weak and die.</p>
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    gameRef.current?.travelGate();
                    closeModal();
                  }}
                >
                  Enter
                </button>
              </div>
            ) : null}
            {modal.kind === "shop" && game && modal.shop === "arena" ? (
              <ArenaBody characterId={record.id} onEnter={(mapId) => { gameRef.current?.enter(mapId, "left"); closeModal(); }} />
            ) : null}
            {modal.kind === "shop" && game && modal.shop !== "arena" ? <ShopBody characterId={record.id} shop={modal.shop} game={game} listings={listings} price={price} setPrice={setPrice} setNote={setNote} refresh={() => void listMarket().then(setListings)} apply={applyEconomy} flush={() => flushRef.current()} /> : null}
            {modal.kind === "trade" && game ? (
              <TradeBody
                characterId={record.id}
                game={game}
                trade={trade}
                offerGold={offerGold}
                setOfferGold={setOfferGold}
                offerUids={offerUids}
                setOfferUids={setOfferUids}
                setTrade={setTrade}
                flush={() => flushRef.current()}
              />
            ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type HoldName = "jump" | "throw" | "block" | "run";

function usePads(gameRef: { current: Game | null }) {
  const els = useRef(new Map<HoldName, HTMLDivElement>());
  const pointers = useRef(new Map<number, { x: number; y: number; origin: HoldName }>());
  const held = useRef<Record<HoldName, boolean>>({ jump: false, throw: false, block: false, run: false });

  function sync() {
    const next: Record<HoldName, boolean> = { jump: false, throw: false, block: false, run: false };
    const slop = 16;
    for (const point of pointers.current.values()) {
      if (point.origin === "run") next.run = true;
      for (const [name, el] of els.current) {
        const rect = el.getBoundingClientRect();
        if (
          point.x >= rect.left - slop &&
          point.x <= rect.right + slop &&
          point.y >= rect.top - slop &&
          point.y <= rect.bottom + slop
        ) {
          next[name] = true;
        }
      }
    }
    (Object.keys(next) as HoldName[]).forEach((name) => {
      if (held.current[name] !== next[name]) {
        held.current[name] = next[name];
        gameRef.current?.setHold(name, next[name]);
      }
    });
  }

  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    const clear = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      syncRef.current();
    };
    const dropAll = () => {
      pointers.current.clear();
      syncRef.current();
    };
    const onHide = () => {
      if (document.hidden) dropAll();
    };
    const lost = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      syncRef.current();
    };
    const beat = window.setInterval(() => {
      if (held.current.throw) gameRef.current?.pulseHold("throw");
    }, 180);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    window.addEventListener("lostpointercapture", lost);
    window.addEventListener("blur", dropAll);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
      window.removeEventListener("lostpointercapture", lost);
      window.removeEventListener("blur", dropAll);
      document.removeEventListener("visibilitychange", onHide);
      window.clearInterval(beat);
    };
  }, [gameRef]);

  const refCallbacks = useRef(new Map<HoldName, (el: HTMLDivElement | null) => void>());

  return {
    ref(name: HoldName) {
      let cb = refCallbacks.current.get(name);
      if (!cb) {
        cb = (el) => {
          if (el) els.current.set(name, el);
          else els.current.delete(name);
        };
        refCallbacks.current.set(name, cb);
      }
      return cb;
    },
    down(name: HoldName, e: ReactPointerEvent<HTMLDivElement>) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, origin: name });
      sync();
    },
    move(e: ReactPointerEvent<HTMLDivElement>) {
      const point = pointers.current.get(e.pointerId);
      if (!point) return;
      point.x = e.clientX;
      point.y = e.clientY;
      sync();
    },
    up(e: ReactPointerEvent<HTMLDivElement>) {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      sync();
    },
  };
}

function Hold({
  pads,
  name,
  label,
  big,
  gold,
  className,
}: {
  pads: ReturnType<typeof usePads>;
  name: HoldName;
  label: string;
  big?: boolean;
  gold?: boolean;
  className?: string;
}) {
  return (
    <div
      role="button"
      ref={pads.ref(name)}
      className={`${big ? `pad pad-big${gold ? " pad-jump" : ""}` : "pad"}${className ? ` ${className}` : ""}`}
      onPointerDown={(e) => pads.down(name, e)}
      onPointerMove={pads.move}
      onPointerUp={pads.up}
      onPointerCancel={pads.up}
    >
      {label}
    </div>
  );
}

function dmChannel(a: string, b: string) {
  return [a, b].sort().join("|");
}

function ChatDock({ characterId, onBag, onGear, onWorld, bagCount = 0 }: { characterId: string; onBag: () => void; onGear: () => void; onWorld?: (line: ChatLine) => void; bagCount?: number }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"world" | "dm" | "guild" | "system">("world");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [threads, setThreads] = useState<{ id: string; name: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [note, setNote] = useState("");
  const since = useRef(0);
  const onWorldRef = useRef(onWorld);
  onWorldRef.current = onWorld;
  const pending = useRef<{ body?: string; dmName?: string; guild?: boolean } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [sys, setSys] = useState(systemLines());
  useEffect(() => onSystem(() => setSys(systemLines().slice())), []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, tab, active, open]);

  useEffect(() => {
    let stop = false;
    let busy = false;
    async function sync() {
      if (busy) return;
      busy = true;
      const job = pending.current;
      pending.current = null;
      try {
        const res = await chatSync({
          data: { characterId, since: since.current, say: job?.body, dmName: job?.dmName, guild: job?.guild },
        });
        if (stop) return;
        if (res.error) setNote(res.error);
        if (res.opened) {
          setThreads((list) => (list.some((t) => t.id === res.opened!.id) ? list : [...list, res.opened!]));
          setActive(res.opened.id);
          setTab("dm");
          setAsking(false);
          setNameDraft("");
        }
        if (res.lines.length) {
          setLines((prev) => {
            const seen = new Set(prev.map((line) => line.id));
            const next = [...prev];
            for (const line of res.lines) {
              if (seen.has(line.id)) continue;
              seen.add(line.id);
              next.push(line);
              if (line.channel === "world") onWorldRef.current?.(line);
            }
            return next.slice(-80);
          });
          since.current = Math.max(since.current, ...res.lines.map((line) => line.at));
        }
      } catch {
        if (job) pending.current = job;
      } finally {
        busy = false;
      }
    }
    const id = window.setInterval(() => void sync(), 2000);
    void sync();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [characterId, tick]);

  function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (tab === "dm") {
      const who = threads.find((t) => t.id === active);
      if (!who) {
        setNote("Pick a private chat first.");
        return;
      }
      pending.current = { body, dmName: who.name };
    } else if (tab === "guild") {
      pending.current = { body, guild: true };
    } else {
      pending.current = { body };
    }
    setDraft("");
    setNote("");
    setTick((n) => n + 1);
  }

  function openDm(e: FormEvent) {
    e.preventDefault();
    const name = nameDraft.trim();
    if (!name) return;
    pending.current = { dmName: name };
    setNote("");
    setTick((n) => n + 1);
  }

  const who = threads.find((t) => t.id === active);
  const shown =
    tab === "world"
      ? lines.filter((line) => line.channel === "world")
      : tab === "guild"
        ? lines.filter((line) => line.channel.startsWith("g:"))
        : who
          ? lines.filter((line) => line.channel === dmChannel(characterId, who.id))
          : [];

  if (!open) {
    return (
      <div className="chat-dock pointer-events-auto absolute z-30">
        <div className="mb-1 flex flex-col items-end gap-0.5">
          {bagCount >= BAG_MAX ? <p className="bag-warn">Bag Full</p> : null}
          <div className="flex gap-1">
            <button type="button" className="bag-btn" onClick={onGear}>Equipment</button>
            <button type="button" className="bag-btn" onClick={onBag}>Bag</button>
          </div>
        </div>
        <button type="button" className="hud-mini" onClick={() => setOpen(true)}>
          Chat
        </button>
      </div>
    );
  }

  return (
    <div className="chat-dock pointer-events-auto absolute z-30" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mb-1 flex flex-col items-end gap-0.5">
        {bagCount >= BAG_MAX ? <p className="bag-warn">Bag Full</p> : null}
        <div className="flex gap-1">
          <button type="button" className="bag-btn" onClick={onGear}>Equipment</button>
          <button type="button" className="bag-btn" onClick={onBag}>Bag</button>
        </div>
      </div>
      <div className="card space-y-1 p-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={`hud-mini${tab === "world" ? " on" : ""}`} onClick={() => setTab("world")}>
            World
          </button>
          <button type="button" className={`hud-mini${tab === "guild" ? " on" : ""}`} onClick={() => setTab("guild")}>
            Guild
          </button>
          <button type="button" className={`hud-mini${tab === "dm" ? " on" : ""}`} onClick={() => setTab("dm")}>
            Private
          </button>
          <button type="button" className={`hud-mini${tab === "system" ? " on" : ""}`} onClick={() => setTab("system")}>
            System
          </button>
          <button type="button" className="hud-mini" onClick={() => setAsking(true)}>
            Private message
          </button>
          <button type="button" className="hud-mini" onClick={() => setOpen(false)}>
            Min
          </button>
        </div>
        {tab === "dm" && threads.length ? (
          <div className="flex gap-1 overflow-x-auto">
            {threads.map((thread) => (
              <button key={thread.id} type="button" className={`hud-mini shrink-0${thread.id === active ? " on" : ""}`} onClick={() => setActive(thread.id)}>
                {thread.name}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={logRef} className="chat-log">
          {tab === "system" ? (
            sys.length ? sys.map((line) => (
              <p key={line.id} className="chat-line">{line.body}</p>
            )) : <p className="chat-line opacity-70">No system notes yet.</p>
          ) : shown.length ? (
            shown.map((line) => (
              <p key={line.id} className="chat-line">
                <span className="text-gold">{line.fromName}:</span> {line.body}
              </p>
            ))
          ) : (
            <p className="chat-line opacity-70">{tab === "world" ? "World chat is quiet." : tab === "guild" ? "Guild chat is quiet." : "No private chats yet."}</p>
          )}
        </div>
        {asking ? (
          <form className="flex gap-1" onSubmit={openDm}>
            <input className="field min-w-0 flex-1 px-1 py-0.5 text-[0.65rem]" placeholder="Hero name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            <button className="hud-mini" type="submit">
              OK
            </button>
            <button className="hud-mini" type="button" onClick={() => setAsking(false)}>
              X
            </button>
          </form>
        ) : tab === "system" ? null : (
          <form className="flex gap-1" onSubmit={send}>
            <input
              className="field min-w-0 flex-1 px-1 py-0.5 text-[0.65rem]"
              placeholder={tab === "world" ? "Say something" : tab === "guild" ? "Guild only" : "Private reply"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => window.scrollTo(0, 0)}
            />
            <button className="hud-mini" type="submit">
              Send
            </button>
          </form>
        )}
        {note ? <p className="text-[0.6rem] text-crimson">{note}</p> : null}
      </div>
    </div>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number, active: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  function move(clientX: number, clientY: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(1, len / max);
    const x = (dx / len) * clamped;
    const y = (dy / len) * clamped;
    setOffset({ x: x * max * 0.55, y: y * max * 0.55 });
    onChange(x, y, true);
  }
  function end() {
    setOffset({ x: 0, y: 0 });
    onChange(0, 0, false);
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
  }
  return (
    <div
      ref={ref}
      className="stick"
      onPointerDown={down}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} />
    </div>
  );
}

function noteOf(res: unknown, ok: string) {
  if (res && typeof res === "object" && "error" in res) {
    const err = (res as { error?: unknown }).error;
    if (typeof err === "string" && err) return err;
  }
  return ok;
}

function LockMark({ item }: { item?: ItemInst }) {
  if (!isBoundItem(item)) return null;
  return <Lock size={12} className="ml-1 inline align-middle text-gold" aria-label="Bound" />;
}

const MOUNT_ART: Record<string, string> = {
  "mount-eagle": "/assets/mounts/eagle.png",
  "mount-condor": "/assets/mounts/condor.png",
  "mount-dragon": "/assets/mounts/dragon.png",
  "mount-raven": "/assets/mounts/raven.png?v=5",
  "mount-demon-bat": "/assets/mounts/demon-bat.png?v=5",
  "mount-phoenix": "/assets/mounts/phoenix.png?v=5",
  "mount-wraith": "/assets/mounts/wraith.png",
};

const CARD_ART: Record<string, string> = {
  "card-slug": "/assets/cards/slug.png",
  "card-frog": "/assets/cards/frog.png",
  "card-birdie": "/assets/cards/birdie.png",
  "card-ember": "/assets/cards/ember.png",
  "card-pink": "/assets/cards/pink.png",
  "card-bat": "/assets/cards/bat.png",
  "card-rat": "/assets/cards/rat.png",
  "card-skfrog": "/assets/cards/skfrog.png",
  "card-vulture": "/assets/cards/vulture.png",
  "card-mole": "/assets/nidavellir/rock.png",
  "card-crag": "/assets/nidavellir/spider.0.png",
  "card-dart": "/assets/nidavellir/spark.0.png",
  "card-frost": "/assets/jotunheim/seal.r.0.png",
  "card-icehop": "/assets/jotunheim/yeti.r.0.png",
  "card-gale": "/assets/jotunheim/snow.0.png",
  "card-pebble": "/assets/vanaheim/fawn.0.png",
  "card-leaper": "/assets/vanaheim/gnome.0.png",
  "card-hawk": "/assets/vanaheim/fairy.0.png",
  "card-ooze": "/assets/niflheim/serpent.0.png",
  "card-mutant": "/assets/niflheim/wolf.0.png",
  "card-wretch": "/assets/niflheim/demon.0.png",
  "card-brokk": "/assets/cards/brokk.png",
  "card-terror": "/assets/nidavellir/terror.swing.png",
  "card-thrym": "/assets/jotunheim/laufey.r.0.png",
  "card-grove": "/assets/vanaheim/elf.0.png",
  "card-freyja2": "/assets/vanaheim/elf.0.png",
  "card-surtur": "/assets/bosses/surtur.r.0.png",
  "card-nidhogg": "/assets/niflheim/hela.0.png",
  "card-baphomet": "/assets/bosses/baphomet.r.0.png",
  "card-mimir": "/assets/cards/mimir.png",
  "card-jormungand": "/assets/cards/jorm.png",
  "card-fenrir": "/assets/cards/fenrir.png",
  "card-odin": "/assets/cards/odin.png",
  "card-catcher": "/assets/cards/catcher.png",
  "card-valkyrie": "/assets/asgard/valkyrie.0.png",
  "card-ultrahela": "/assets/niflheim/hela.3.png",
  "card-thor": "/assets/asgard/thor.0.png",
  "card-thor2": "/assets/asgard/thor2.0.png",
  "card-loki": "/assets/asgard/loki.0.png",
  "card-heimdall": "/assets/asgard/heimdall.0.png",
  "card-skadi": "/assets/cards/skadi.png?v=8",
  "card-tyr": "/assets/asgard/tyr.0.png",
};

const BORDER_HEX: Record<string, string> = {
  White: "#f4f4f4",
  Green: "#3ddc7a",
  Blue: "#4aa3ff",
  Purple: "#b06bff",
  Red: "#e23b3b",
  "Golden Yellow": "#f0c014",
};

function ItemFace({ id, compact }: { id?: string; compact?: boolean }) {
  if (!id) return null;
  const def = itemDef(id);
  const src =
    id.startsWith("mount-")
      ? MOUNT_ART[id] ?? ""
      : id.startsWith("card-")
        ? CARD_ART[id] ?? ""
        : id === "talaria"
          ? "/assets/items/talaria.png"
          : id === "yggdrasil-branch"
            ? "/assets/items/yggdrasil.png"
            : `/assets/items/icons/${id}.png?v=11`;
  if (def?.kind === "card") {
    const color = BORDER_HEX[def.border ?? ""] ?? "#f4f4f4";
    return (
      <span className={`${compact ? "inline-flex h-7 w-6" : "mr-1 inline-flex h-10 w-8"} items-end justify-center overflow-hidden align-middle`} style={{ border: `2px solid ${color}`, background: "#1a120c" }}>
        {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <span className="px-0.5 text-[0.45rem] text-gold">{def.border}</span>}
      </span>
    );
  }
  if (src) return <img src={src} alt="" className={`${compact ? "inline-block h-7 w-7" : "mr-1 inline-block h-8 w-8"} object-contain align-middle`} />;
  return (
    <svg viewBox="0 0 32 32" className={`${compact ? "inline-block h-7 w-7" : "mr-1 inline-block h-8 w-8"} align-middle`} aria-hidden>
      <ItemGlyph id={id} />
    </svg>
  );
}

function ItemGlyph({ id }: { id: string }) {
  const def = itemDef(id);
  const kind = def?.kind;
  const liquid = id.includes("blue") ? "#6ec8ff" : id.includes("violet") ? "#c58bff" : id.includes("gold") ? "#ffe27a" : "#e23b3b";
  if (kind === "potion") {
    return (
      <>
        <rect x="13" y="3" width="6" height="6" rx="1" fill="#d7ecf5" stroke="#2a1408" />
        <path d="M9 10h14l2 14a6 6 0 0 1-6 5h-6a6 6 0 0 1-6-5z" fill="#f4fbff" stroke="#2a1408" />
        <path d="M10 16h12v8a5 5 0 0 1-5 4h-2a5 5 0 0 1-5-4z" fill={liquid} />
      </>
    );
  }
  if (kind === "weapon") {
    if (id.includes("boomerang")) return <path d="M8 22c8-16 16-8 12 2" fill="none" stroke="#f0d48a" strokeWidth="4" strokeLinecap="round" />;
    if (id.includes("star")) return <polygon points="16,3 19,12 28,12 21,18 23,28 16,22 9,28 11,18 4,12 13,12" fill="#ffe27a" stroke="#2a1408" />;
    if (id.includes("fire")) return <circle cx="16" cy="18" r="8" fill="#ff7a1a" stroke="#2a1408" />;
    if (id.includes("acid")) return <circle cx="16" cy="18" r="8" fill="#39d36a" stroke="#2a1408" />;
    if (id.includes("ice") || id.includes("comet")) return <polygon points="16,4 22,28 10,28" fill="#b9e8ff" stroke="#2a1408" />;
    if (id.includes("rock")) return <ellipse cx="16" cy="18" rx="9" ry="7" fill="#8d8478" stroke="#2a1408" />;
    return <circle cx="16" cy="17" r="7" fill="#f4f4f4" stroke="#2a1408" />;
  }
  if (kind === "gem") return <polygon points="16,4 26,16 16,28 6,16" fill="#9b6bff" stroke="#2a1408" />;
  if (kind === "head") return <path d="M8 18a8 8 0 0 1 16 0v4H8z" fill="#c0c6d4" stroke="#2a1408" />;
  if (kind === "body") return <path d="M8 8h16l-2 16H10z" fill="#8d5a32" stroke="#2a1408" />;
  if (kind === "legs") return <path d="M10 8h5v16h-5zm7 0h5v16h-5z" fill="#6d7f55" stroke="#2a1408" />;
  if (kind === "neck") return <path d="M8 12a8 8 0 0 0 16 0" fill="none" stroke="#ffe27a" strokeWidth="3" />;
  if (kind === "acc") return <circle cx="16" cy="16" r="7" fill="none" stroke="#e4b15a" strokeWidth="3" />;
  if (id.startsWith("key-")) return <path d="M10 16a4 4 0 1 1 6 3v7h-3v-2h-2v2H8z" fill="#e4b15a" stroke="#2a1408" />;
  return <circle cx="16" cy="16" r="8" fill="#f0d48a" stroke="#2a1408" />;
}

function GuildStart({ characterId, setNote }: { characterId: string; setNote: (value: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="space-y-2 border-t border-gold/30 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void guildCreate({ data: { characterId, name } }).then((res) => setNote(noteOf(res, `Guild ${name} is open.`)));
      }}
    >
      <p className="text-gold">Start a guild</p>
      <input className="field" placeholder="Guild name" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="btn w-full">Found guild</button>
    </form>
  );
}

function MountSheet({
  game,
  characterId,
  note,
  setNote,
  seeMount,
  setSeeMount,
  showSkins,
  setShowSkins,
  showCash,
  setShowCash,
  apply,
}: {
  game: Game;
  characterId: string;
  note: string;
  setNote: (value: string) => void;
  seeMount: string | null;
  setSeeMount: (id: string | null) => void;
  showSkins: boolean;
  setShowSkins: (value: boolean) => void;
  showCash: boolean;
  setShowCash: (value: boolean) => void;
  apply: (next: { state: HeroRecord["state"]; revision: number }) => void;
}) {
  const owned = [...game.state.bag, game.state.equip.mount].filter((it): it is ItemInst => !!it && itemDef(it.id)?.kind === "mount");
  const skins = [...game.state.bag, ...game.state.storage].filter((it) => itemDef(it.id)?.kind === "skin");
  const seen = seeMount ? MOUNTS.find((m) => m.id === seeMount) : undefined;
  return (
    <div className="card max-h-[68vh] overflow-auto p-2">
      <div className="space-y-1.5 text-[0.68rem]">
        <p className="text-[0.58rem] leading-tight">You do not ride. The mount flies and you hang on below. Jump or the Dismount button lets go.</p>
        {note ? <p className="text-[0.58rem] text-gold">{note}</p> : null}
        {owned.length ? owned.map((item) => (
          <div key={item.uid} className="rounded-md border border-gold/30 p-1">
            <p className="leading-tight">
              {itemDef(item.id)?.name ?? item.id}
              <LockMark item={item} />
              {item.skin ? <span className="block text-[0.55rem]">Skin: {itemDef(item.skin)?.name ?? item.skin}</span> : null}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              <button type="button" className="btn-ghost" onClick={() => game.equipUid(item.uid)}>Equip</button>
              <button type="button" className="btn-ghost" onClick={() => { if (game.state.equip.mount?.uid !== item.uid && game.state.equip.mount?.id !== item.id) game.equipUid(item.uid); game.toggleMount(); }}>Hang on</button>
              <button type="button" className="btn-ghost" onClick={() => setSeeMount(seeMount === item.id ? null : item.id)}>See</button>
              {item.skin ? <button type="button" className="btn-ghost" onClick={() => setNote(game.clearSkin(item.uid) || "Skin removed.")}>Unequip skin</button> : null}
            </div>
          </div>
        )) : <p className="text-[0.58rem]">No mounts yet. The stable takes projectile weapons. Phoenix comes from City Hall.</p>}
        {seen ? (
          <div className="space-y-0.5">
            <p className="text-gold">{seen.name} · speed +{seen.speed}</p>
            {MOUNT_ART[seen.id] ? <img src={MOUNT_ART[seen.id]} alt={seen.name} className="mx-auto h-16 w-full object-contain" /> : <p className="text-[0.55rem]">{seen.blurb}</p>}
          </div>
        ) : null}
        <div className="flex gap-1">
          <button type="button" className="btn-ghost flex-1" onClick={() => setShowSkins(!showSkins)}>Skins</button>
          <button type="button" className="btn-ghost flex-1" onClick={() => setNote(game.clearSkin() || "Skin removed.")}>Unequip skin</button>
        </div>
        {showSkins ? (
          skins.length ? (
            <div className="grid grid-cols-2 gap-1">
              {skins.map((skin) => (
                <button key={skin.uid} type="button" className="btn-ghost text-left text-[0.58rem]" onClick={() => setNote(game.applySkin(skin.id, game.state.equip.mount?.uid) || "Skin applied.")}>
                  Apply {itemDef(skin.id)?.name ?? skin.id}
                  <LockMark item={skin} />
                </button>
              ))}
            </div>
          ) : <p className="text-[0.58rem]">No skins in the bag. A skin only shows while you own a mount.</p>
        ) : null}
        <p className="text-[0.55rem] leading-tight">Mount skin goes on the equipped mount. Buy boxes in the Mount Skin Shop.</p>
        <p className="text-gold">Every mount</p>
        <div className="grid grid-cols-3 gap-1">
          {MOUNTS.map((mount) => (
            <button key={mount.id} type="button" className="rounded-md border border-gold/25 p-1 text-left" onClick={() => setSeeMount(seeMount === mount.id ? null : mount.id)}>
              {MOUNT_ART[mount.id] ? <img src={MOUNT_ART[mount.id]} alt="" className="mx-auto h-11 w-full object-contain" /> : null}
              <span className="block text-center text-[0.52rem] leading-tight">{mount.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartySheet({
  characterId,
  social,
  note,
  setNote,
  inviteName,
  setInviteName,
  onRefresh,
}: {
  characterId: string;
  social: SocialSnap | null;
  note: string;
  setNote: (value: string) => void;
  inviteName: string;
  setInviteName: (value: string) => void;
  onRefresh: () => void;
}) {
  const party = social?.party ?? null;
  const leader = party?.leaderId === characterId;
  return (
    <div className="card max-h-[46vh] overflow-auto p-3 text-sm">
      <div className="space-y-2">
        {note ? <p className="text-xs text-gold">{note}</p> : null}
        {!party ? (
          <button type="button" className="btn w-full" onClick={() => void partyCreate({ data: { characterId } }).then((res) => { setNote(noteOf(res, "Party started. Invite by name.")); onRefresh(); })}>
            Start party
          </button>
        ) : (
          <>
            <p className="text-xs">{party.members.length}/6. Experience is split evenly. A full party of 6 grants 1.5× before the split.</p>
            {party.members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-1">
                <span className="min-w-0 flex-1">{member.name}{member.id === party.leaderId ? " · leader" : ""}</span>
                {leader && member.id !== characterId ? (
                  <>
                    <button type="button" className="btn-ghost" onClick={() => void partyKick({ data: { characterId, memberId: member.id } }).then((res) => { setNote(noteOf(res, "Kicked.")); onRefresh(); })}>Kick</button>
                    <button type="button" className="btn-ghost" onClick={() => void partyLead({ data: { characterId, memberId: member.id } }).then((res) => { setNote(noteOf(res, "They lead now.")); onRefresh(); })}>Appoint</button>
                  </>
                ) : null}
              </div>
            ))}
            <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void partyInvite({ data: { characterId, name: inviteName } }).then((res) => { setNote(noteOf(res, `Invited ${inviteName}.`)); setInviteName(""); onRefresh(); }); }}>
              <input className="field min-w-0 flex-1" placeholder="Hero name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              <button type="submit" className="btn-ghost">Invite</button>
            </form>
            <button type="button" className="btn-ghost w-full" onClick={() => void partyLeave({ data: { characterId } }).then(() => { setNote("You left the party."); onRefresh(); })}>Leave party</button>
          </>
        )}
      </div>
    </div>
  );
}

function GuildSheet({
  characterId,
  social,
  note,
  setNote,
  guildDraft,
  setGuildDraft,
  onRefresh,
}: {
  characterId: string;
  social: SocialSnap | null;
  note: string;
  setNote: (value: string) => void;
  guildDraft: string;
  setGuildDraft: (value: string) => void;
  onRefresh: () => void;
}) {
  const mine = social?.mine ?? null;
  const leader = mine?.leaderId === characterId;
  return (
    <div className="card max-h-[46vh] overflow-auto p-3 text-sm">
      <div className="space-y-2">
        {note ? <p className="text-xs text-gold">{note}</p> : null}
        {mine ? (
          <>
            <p className="text-gold">{mine.name}</p>
            <p className="text-xs">{mine.points} guild points. +{mine.points} to all six stats while you belong. Leave and the bonus goes with the guild.</p>
            {mine.members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-1">
                <span className="min-w-0 flex-1">{member.name}{member.id === mine.leaderId ? " · leader" : ""}</span>
                {leader && member.id !== characterId ? (
                  <button type="button" className="btn-ghost" onClick={() => void guildLeave({ data: { characterId, appointId: member.id } }).then((res) => { setNote(noteOf(res, `${member.name} leads. You stepped down.`)); onRefresh(); })}>Appoint and leave</button>
                ) : null}
              </div>
            ))}
            <p className="text-xs">{mine.members.length}/50</p>
            <button type="button" className="btn-ghost w-full" onClick={() => void guildLeave({ data: { characterId } }).then((res) => { setNote(noteOf(res, "You left the guild.")); onRefresh(); })}>Leave guild</button>
            {leader ? (
              <button type="button" className="btn-ghost w-full" onClick={() => void guildLeave({ data: { characterId, disband: true } }).then((res) => { setNote(noteOf(res, "Guild disbanded.")); onRefresh(); })}>Disband guild</button>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs">Guilds hold 50. Anyone can found one.</p>
            <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void guildCreate({ data: { characterId, name: guildDraft } }).then((res) => { setNote(noteOf(res, "Guild founded.")); setGuildDraft(""); onRefresh(); }); }}>
              <input className="field min-w-0 flex-1" placeholder="Guild name" value={guildDraft} onChange={(e) => setGuildDraft(e.target.value)} />
              <button type="submit" className="btn-ghost">Create</button>
            </form>
            {(social?.guilds ?? []).map((guild) => (
              <button key={guild.id} type="button" className="btn-ghost w-full text-left" onClick={() => void guildJoin({ data: { characterId, guildId: guild.id } }).then((res) => { setNote(noteOf(res, `Joined ${guild.name}.`)); onRefresh(); })}>
                {guild.name} · {guild.members}/50 · {guild.points} pts
              </button>
            ))}
            {!social?.guilds.length ? <p className="text-xs">No guilds yet.</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

function ArenaBody({ characterId, onEnter }: { characterId: string; onEnter: (mapId: "duel" | "ffa" | "ffa-ultra") => void }) {
  const [mode, setMode] = useState<"ask" | "ranks" | "rooms">("ask");
  const [board, setBoard] = useState<Awaited<ReturnType<typeof arenaBoard>> | null>(null);
  const [note, setNote] = useState("");
  async function loadBoard() {
    const next = await arenaBoard({ data: { characterId } });
    setBoard(next);
    if (mode === "rooms" && next && "go" in next && next.go === "duel") onEnter("duel");
  }
  useEffect(() => {
    if (mode === "ask") return;
    void loadBoard();
    const id = window.setInterval(() => void loadBoard(), 1500);
    return () => window.clearInterval(id);
  }, [mode, characterId]);
  if (mode === "ask") {
    return (
      <div className="space-y-2">
        <p className="text-sm">Duels keep your bag. Dying sends you back to Midgard.</p>
        <button type="button" className="btn w-full" onClick={() => setMode("ranks")}>View Rankings</button>
        <button type="button" className="btn w-full" onClick={() => setMode("rooms")}>Enter Battle</button>
      </div>
    );
  }
  if (!board || "error" in board) return <p className="text-sm">{board && "error" in board ? board.error : "Opening the stadium..."}</p>;
  if (mode === "ranks") {
    return (
      <div className="space-y-2 text-sm">
        <button type="button" className="btn-ghost" onClick={() => setMode("ask")}>Back</button>
        {board.ranks.length ? board.ranks.map((row) => (
          <p key={row.name}>{row.name} · {row.wins} wins · {row.losses} losses · {row.ffa} free-for-all kills</p>
        )) : <p>No ranks yet.</p>}
      </div>
    );
  }
  const mine = board.mine;
  const ready = mine && ((mine.hostId === characterId && mine.hostReady) || (mine.guestId === characterId && mine.guestReady));
  return (
    <div className="space-y-2 text-sm">
      <button type="button" className="btn-ghost" onClick={() => setMode("ask")}>Back</button>
      {note ? <p className="text-crimson">{note}</p> : null}
      <button type="button" className="btn w-full" onClick={() => onEnter("ffa")}>
        Free For All ({board.ffa} inside)
      </button>
      <button type="button" className="btn w-full" onClick={() => onEnter("ffa-ultra")}>
        Ultra Boss Arena
      </button>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => void arenaCreate({ data: { characterId } }).then((next) => {
          if ("error" in next) setNote(next.error);
          else setBoard(next);
        })}
      >
        Create 1 vs 1 room
      </button>
      {mine ? (
        <div className="space-y-1 rounded-lg border border-gold/40 p-2">
          <p>{mine.hostName} vs {mine.guestName ?? "waiting"} · {mine.guestId ? "2/2" : "1/2"}</p>
          <p>Ready: {mine.hostName} {mine.hostReady ? "yes" : "no"}{mine.guestName ? ` · ${mine.guestName} ${mine.guestReady ? "yes" : "no"}` : ""}</p>
          <button
            type="button"
            className="btn w-full"
            disabled={!!ready || !mine.guestId}
            onClick={() => void arenaReady({ data: { characterId } }).then((next) => {
              if ("error" in next) setNote(next.error);
              else {
                setBoard(next);
                if ("go" in next && next.go === "duel") onEnter("duel");
              }
            })}
          >
            {ready ? "Waiting for the other hero" : !mine.guestId ? "Waiting for an opponent" : "Ready"}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => void arenaLeave({ data: { characterId } }).then((next) => { if (!("error" in next)) setBoard(next); })}>
            Leave room
          </button>
        </div>
      ) : null}
      {board.rooms.filter((room) => room.id !== mine?.id).map((room) => (
        <button
          key={room.id}
          type="button"
          className="btn-ghost w-full text-left"
          onClick={() => void arenaJoin({ data: { characterId, roomId: room.id } }).then((next) => {
            if ("error" in next) setNote(next.error);
            else setBoard(next);
          })}
        >
          {room.hostName} · {room.guestId ? "2/2" : "1/2"} · Join
        </button>
      ))}
    </div>
  );
}

function ShopBody({
  characterId,
  shop,
  game,
  listings,
  price,
  setPrice,
  setNote,
  refresh,
  apply,
  flush,
}: {
  characterId: string;
  shop: string;
  game: Game;
  listings: Listing[];
  price: string;
  setPrice: (value: string) => void;
  setNote: (value: string) => void;
  refresh: () => void;
  apply: (next: { state: HeroRecord["state"]; revision: number }) => void;
  flush: () => Promise<boolean>;
}) {
  const [goldDraft, setGoldDraft] = useState("");
  const [ask, setAsk] = useState(false);
  const [sellAsk, setSellAsk] = useState<null | { uid: string; name: string; max: number; each: number }>(null);
  const [sellDraft, setSellDraft] = useState("1");
  const [qtyAsk, setQtyAsk] = useState<null | { uid: string; dir: "in" | "out"; max: number; name: string }>(null);
  const [qtyDraft, setQtyDraft] = useState("1");
  const stock = CATALOG.filter((item) => item.shop === shop || (shop === "auction" && item.id.startsWith("key-")));
  if (shop === "hall") {
    const q = game.state.quest ?? { step: 0, kills: 0, accepted: false, repeat: 0 };
    return (
      <div className="space-y-2 text-sm">
        <p>Completed {Math.min(q.step, MAIN_QUESTS)} of {MAIN_QUESTS} quests. The Flaming Phoenix is the reward for all {MAIN_QUESTS}.</p>
        <p>{q.accepted ? `${questBlurb(q)} Killed ${q.kills} of ${questNeed(q)}.` : "No hunt accepted yet."}</p>
        <p className="text-xs">Finishing this hunt pays {questReward(q)} EXP.{q.step >= MAIN_QUESTS ? " Repeating hunts also give the guild 1 point." : ""}</p>
        <button type="button" className="btn w-full" onClick={() => game.acceptQuest()}>Accept next quest</button>
        <button type="button" className="btn w-full" disabled={!questReady(q)} onClick={() => game.completeQuest()}>Complete Quest</button>
        {game.state.level >= 99 ? (
          ask ? (
            <div className="space-y-2 rounded-lg border border-gold/40 p-2">
              <p>Are you sure? Your level and stats reset to 1. Each reborn grants +10 starting stats for all 6 stats, up to 10 reborns.</p>
              <button type="button" className="btn w-full" onClick={() => { game.reborn(); setAsk(false); }}>Confirm</button>
              <button type="button" className="btn-ghost w-full" onClick={() => setAsk(false)}>Not now</button>
            </div>
          ) : (
            <button type="button" className="btn w-full" onClick={() => setAsk(true)}>Reborn</button>
          )
        ) : (
          <p className="text-xs">Reborn unlocks at level 99. You are level {game.state.level}{game.state.reborn ? `, reborn ${game.state.reborn}/10` : ""}. Limit is 10 reborns.</p>
        )}
        <GuildStart characterId={characterId} setNote={setNote} />
      </div>
    );
  }
  if (shop === "stable") {
    const credits = projectileCredits(game.state.bag);
    return (
      <div className="space-y-2 text-sm">
        <p>Projectile credits: {credits}. Every throwing weapon is 1 credit. Kids Baseball does not count.</p>
        <p className="text-xs">Mounts fly and you hang underneath. Jump or Dismount lets go. The mount stays equipped.</p>
        {MOUNTS.filter((mount) => mount.cost > 0).map((mount) => (
          <button key={mount.id} type="button" className="btn-ghost w-full text-left" onClick={() => setNote(game.buyMount(mount.id) || `${mount.name} is in your bag.`)}>
            {mount.name} · {mount.cost} projectiles · Movement speed +{mount.speed}
            <span className="block text-xs">{mount.blurb}</span>
          </button>
        ))}
      </div>
    );
  }
  if (shop === "casino") {
    const colors = new Map<string, number>();
    const reds = new Map<string, { id: string; plus: number; name: string; qty: number }>();
    for (const it of game.state.bag) {
      const def = itemDef(it.id);
      if (def?.kind !== "card") continue;
      const qty = it.qty ?? 1;
      if (def.border === "Red" || def.border === "Golden Yellow") {
        const plus = it.plus ?? 0;
        const key = `${it.id}:${plus}`;
        const row = reds.get(key) ?? { id: it.id, plus, name: def.name, qty: 0 };
        row.qty += qty;
        reds.set(key, row);
      } else if (def.border) {
        colors.set(def.border, (colors.get(def.border) ?? 0) + qty);
      }
    }
    const order = ["White", "Green", "Blue", "Purple"];
    return (
      <div className="space-y-2 text-sm">
        <p>Ten cards of the same color become one random card of the next color. White, then Green, then Blue, then Purple. Purple stops there. Ten of the exact same red or yellow boss card add +1 to every bonus, then +2, and so on. Past +1000 the card shows +1k.</p>
        {order.map((border) => {
          const qty = colors.get(border) ?? 0;
          if (!qty && border === "Purple") return null;
          return (
            <button
              key={border}
              type="button"
              className="btn-ghost w-full text-left"
              disabled={qty < 10 && border !== "Purple"}
              onClick={() => setNote(game.fuseBorder(border) || `Ten ${border} cards fused.`)}
            >
              {border} cards · {qty} in the bag{border === "Purple" ? " · no next color" : qty < 10 ? " (need 10)" : ""}
            </button>
          );
        })}
        {[...reds.values()].map((row) => (
          <button
            key={`${row.id}:${row.plus}`}
            type="button"
            className="btn-ghost w-full text-left"
            disabled={row.qty < 10}
            onClick={() => setNote(game.combineCards(row.id, row.plus) || `${row.name} bonus ${formatPlus(row.plus + 1)}.`)}
          >
            <ItemFace id={row.id} />
            {row.name}{row.plus ? ` ${formatPlus(row.plus)}` : ""} · {row.qty} in the bag{row.qty < 10 ? " (need 10 of this card)" : ""}
          </button>
        ))}
        {!colors.size && !reds.size ? <p className="text-xs">No cards in the bag. The item shop is selling every card for testing.</p> : null}
      </div>
    );
  }
  if (shop === "ferry") {
    return (
      <div className="space-y-3 text-sm">
        <p>The guide poles the black water with a long stick. He will take you back to Hela's nightmare.</p>
        <button
          type="button"
          className="btn w-full"
          onClick={() => {
            game.enter("niflheim-nightmare", "right");
            game.dismissModal = true;
          }}
        >
          Return to Niflheim
        </button>
      </div>
    );
  }
  if (shop === "friend") {
    return (
      <div className="space-y-3 text-sm">
        <p>Your friend keeps a Soul Stone for you. One, every 7 days.</p>
        <button type="button" className="btn w-full" onClick={() => game.claimSoul()}>Take Soul Stone</button>
      </div>
    );
  }
  if (shop === "inn") {
    return (
      <div className="space-y-3">
        <p>The innkeeper mends you for 25 gold. Fully. HP and SP.</p>
        <button type="button" className="btn" onClick={() => game.healInn()}>
          Rest
        </button>
      </div>
    );
  }
  if (shop === "warehouse") {
    return (
      <div className="space-y-2 text-sm">
        <p>
          Vault {game.state.storage.length}/100 · bank {game.state.bankGold} g · pouch {game.state.gold} g
        </p>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="btn-ghost" onClick={() => game.bankGold(100, "in")}>Store 100</button>
          <button type="button" className="btn-ghost" onClick={() => game.bankGold(1000, "in")}>Store 1000</button>
          <button type="button" className="btn-ghost" onClick={() => game.bankGold(100, "out")}>Take 100</button>
          <button type="button" className="btn-ghost" onClick={() => game.bankGold(game.state.bankGold, "out")}>Take all</button>
        </div>
        <div className="flex gap-1">
          <input className="field" inputMode="numeric" placeholder="Gold amount" value={goldDraft} onChange={(e) => setGoldDraft(e.target.value)} />
          <button type="button" className="btn-ghost" onClick={() => { game.bankGold(Number(goldDraft) || 0, "in"); setNote("Gold stored."); }}>Store gold</button>
          <button type="button" className="btn-ghost" onClick={() => { game.bankGold(Number(goldDraft) || 0, "out"); setNote("Gold taken."); }}>Take gold</button>
        </div>
        <p className="text-xs">Gold and goods in the warehouse stay when you die. The bag does not. This vault is shared by every hero on the account.</p>
        <p className="text-gold">In the bag</p>
        {qtyAsk ? (
          <div className="space-y-1 rounded-lg border border-gold/40 p-2">
            <p>How many {qtyAsk.name}? 1–{qtyAsk.max}</p>
            <input className="field" inputMode="numeric" value={qtyDraft} onChange={(e) => setQtyDraft(e.target.value)} />
            <div className="flex gap-1">
              <button
                type="button"
                className="btn flex-1"
                onClick={() => {
                  const n = Math.max(1, Math.min(qtyAsk.max, Math.floor(Number(qtyDraft) || 0)));
                  const err = qtyAsk.dir === "in" ? game.storeItem(qtyAsk.uid, n) : game.withdrawItem(qtyAsk.uid, n);
                  setNote(err || (qtyAsk.dir === "in" ? `Stored ${n}.` : `Withdrew ${n}.`));
                  setQtyAsk(null);
                }}
              >
                Confirm
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setQtyAsk(null)}>Cancel</button>
            </div>
          </div>
        ) : null}
        {game.state.bag.map((item) => (
          <button key={item.uid} type="button" className="btn-ghost w-full text-left" onClick={() => {
            const qty = item.qty ?? 1;
            const name = itemDef(item.id)?.name ?? item.id;
            if (qty > 1) {
              setQtyAsk({ uid: item.uid, dir: "in", max: qty, name });
              setQtyDraft(String(qty));
              return;
            }
            setNote(game.storeItem(item.uid, 1) || "Stored.");
          }}>
            <ItemFace id={item.id} />
            Store {itemDef(item.id)?.name ?? item.id}{item.qty && item.qty > 1 ? ` x${item.qty}` : ""}
          </button>
        ))}
        <p className="text-gold">In storage</p>
        {game.state.storage.length ? game.state.storage.map((item) => (
          <button key={item.uid} type="button" className="btn-ghost w-full text-left" onClick={() => {
            const qty = item.qty ?? 1;
            const name = itemDef(item.id)?.name ?? item.id;
            if (qty > 1) {
              setQtyAsk({ uid: item.uid, dir: "out", max: qty, name });
              setQtyDraft(String(qty));
              return;
            }
            setNote(game.withdrawItem(item.uid, 1) || "Withdrawn.");
          }}>
            <ItemFace id={item.id} />
            Take {itemDef(item.id)?.name ?? item.id}{item.qty && item.qty > 1 ? ` x${item.qty}` : ""}{item.charges != null ? ` (${item.charges}/3)` : ""}
          </button>
        )) : <p className="text-xs">Storage is empty.</p>}
      </div>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p>Pouch {game.state.gold} g · {game.state.equip.weapon ? itemDef(game.state.equip.weapon.id)?.name : "No weapon"}</p>
      {stock.map((item) => (
        <button
          key={item.id}
          type="button"
          className="btn-ghost w-full text-left"
          onClick={() => setNote(game.buy(item.id) || `Bought ${item.name}.`)}
        >
          {item.name} · {item.price} g
          <ItemFace id={item.id} />
          <span className="block text-xs">{item.desc}</span>
          {item.id === "talaria" ? <img src="/assets/items/talaria.png" alt="Talaria" className="mt-1 h-14 w-14 object-contain" /> : null}
          {item.id === "yggdrasil-branch" ? <img src="/assets/items/yggdrasil.png" alt="Yggdrasil Branch" className="mt-1 h-14 w-14 object-contain" /> : null}
        </button>
      ))}
      {shop === "item" || shop === "potion" || shop === "auction" ? (
        <>
          <p className="pt-2 text-gold">Sell from the bag</p>
          {sellAsk ? (
            <div className="space-y-1 rounded-lg border border-gold/40 p-2">
              <p>You have {sellAsk.max} {sellAsk.name}. Each sells for {sellAsk.each} gold ({sellAsk.max * sellAsk.each} if you sell them all). How many?</p>
              <input className="field" inputMode="numeric" value={sellDraft} onChange={(e) => setSellDraft(e.target.value)} />
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => {
                    const n = Math.max(1, Math.min(sellAsk.max, Math.floor(Number(sellDraft) || 0)));
                    setNote(game.sell(sellAsk.uid, n));
                    setSellAsk(null);
                  }}
                >
                  Confirm
                </button>
                <button type="button" className="btn-ghost flex-1" onClick={() => setSellAsk(null)}>Cancel</button>
              </div>
            </div>
          ) : null}
          {game.state.bag.filter((item) => shop !== "auction" || item.id.startsWith("key-")).map((item) => {
            const def = itemDef(item.id);
            const qty = item.qty ?? 1;
            const each = Math.max(1, Math.floor(((def?.price || 40) * 0.4)));
            return (
              <button key={item.uid} type="button" className="btn-ghost w-full text-left" onClick={() => {
                setSellAsk({ uid: item.uid, name: def?.name ?? item.id, max: qty, each });
                setSellDraft(String(qty));
              }}>
                <ItemFace id={item.id} />
                Sell {def?.name ?? item.id} · you have {qty} · {each} g each
              </button>
            );
          })}
        </>
      ) : null}
      {shop === "auction" ? (
        <>
          <p className="pt-2 text-gold">Player listings</p>
          <div className="flex gap-2">
            <input className="field" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          {game.state.bag.map((item) => (
            <button
              key={`list-${item.uid}`}
              type="button"
              className="btn-ghost w-full text-left"
              onClick={() => {
                void (async () => {
                  await flush();
                  const res = await postListing({ data: { characterId, uid: item.uid, price: Number(price) || 0 } });
                  if ("error" in res) setNote(res.error);
                  else {
                    apply(res);
                    setNote("Listed.");
                    refresh();
                  }
                })();
              }}
            >
              List {itemDef(item.id)?.name ?? item.id}
            </button>
          ))}
          {listings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              className="btn-ghost w-full text-left"
              onClick={() => {
                void (async () => {
                  await flush();
                  const res = await buyListing({ data: { characterId, id: listing.id } });
                  if ("error" in res) setNote(res.error);
                  else {
                    apply(res);
                    setNote("Bought from the board.");
                    refresh();
                  }
                })();
              }}
            >
              {itemDef(listing.item.id)?.name ?? listing.item.id} · {listing.price} g · {listing.sellerName}
            </button>
          ))}
          {!listings.length ? <p className="text-xs">No player listings yet.</p> : null}
        </>
      ) : null}
    </div>
  );
}

function TradeBody({
  characterId,
  game,
  trade,
  offerGold,
  setOfferGold,
  offerUids,
  setOfferUids,
  setTrade,
  flush,
}: {
  characterId: string;
  game: Game;
  trade: TradeView | null;
  offerGold: string;
  setOfferGold: (value: string) => void;
  offerUids: string[];
  setOfferUids: (value: string[]) => void;
  setTrade: (view: TradeView) => void;
  flush: () => Promise<boolean>;
}) {
  if (!trade || trade.phase === "none") return <p>{trade?.error || "Finding them…"}</p>;
  if (trade.phase === "done") return <p>The trade is sealed. Check your bag.</p>;
  return (
    <div className="space-y-2 text-sm">
      <p>
        Yours confirmed {trade.myOk ?? 0}/2 · theirs {trade.theirOk ?? 0}/2
      </p>
      {trade.error ? <p className="text-crimson">{trade.error}</p> : null}
      <p className="text-gold">Their offer: {trade.theirs?.gold ?? 0} g</p>
      {(trade.theirs?.items ?? []).map((item) => (
        <p key={item.uid}>{itemDef(item.id)?.name ?? item.id}</p>
      ))}
      <input className="field" inputMode="numeric" value={offerGold} onChange={(e) => setOfferGold(e.target.value)} />
      {game.state.bag.map((item) => (
        <button
          key={item.uid}
          type="button"
          className="btn-ghost w-full text-left"
          onClick={() => setOfferUids(offerUids.includes(item.uid) ? offerUids.filter((id) => id !== item.uid) : [...offerUids, item.uid])}
        >
          {offerUids.includes(item.uid) ? "Offering" : "Offer"} {itemDef(item.id)?.name ?? item.id}
        </button>
      ))}
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => {
          if (!trade.id) return;
          void tradeOffer({ data: { characterId, id: trade.id, gold: Number(offerGold) || 0, uids: offerUids } }).then(setTrade);
        }}
      >
        Update offer
      </button>
      <button
        type="button"
        className="btn w-full"
        onClick={() => {
          if (!trade.id) return;
          void (async () => {
            await flush();
            const view = await tradeConfirm({ data: { characterId, id: trade.id! } });
            setTrade(view);
            if (view.state && view.revision) {
              game.adoptEconomy(view.state);
            }
          })();
        }}
      >
        {(trade.myOk ?? 0) >= 1 ? "Confirm again" : "Confirm"}
      </button>
    </div>
  );
}

function hoursLeft(until: number) {
  const hours = Math.max(1, Math.ceil((until - Date.now()) / 3600000));
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function Roster({
  atlas,
  heroes,
  onPlay,
  onCreate,
  onChanged,
}: {
  atlas: Atlas;
  heroes: HeroCard[];
  onPlay: (id: string) => void;
  onCreate: () => void;
  onChanged: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  return (
    <div className="card w-full max-w-md space-y-3 p-4">
      <h1 className="font-display text-xl text-gold">Your heroes</h1>
      <p className="text-xs">{heroes.length}/6 on this account.</p>
      {note ? <p className="text-sm text-crimson">{note}</p> : null}
      {heroes.map((hero) => (
        <div key={hero.id} className="rounded-lg border border-gold/30 p-2">
          <div className="flex items-center gap-2">
            <Portrait atlas={atlas} hero={hero.hero} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-gold">{hero.name}</p>
              <p className="text-xs">Lv {hero.level} · {HEROES.find((entry) => entry.id === hero.hero)?.name}</p>
              {hero.deleteAt ? <p className="text-xs text-crimson">Deletes in {hoursLeft(hero.deleteAt)}. You can cancel until then.</p> : null}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => onPlay(hero.id)}>
              Play
            </button>
            {hero.deleteAt ? (
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  void cancelDelete({ data: { characterId: hero.id } }).then((res) => {
                    if ("error" in res) setNote(res.error);
                    else onChanged();
                  });
                }}
              >
                Cancel deletion
              </button>
            ) : confirmId === hero.id ? (
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  void scheduleDelete({ data: { characterId: hero.id } }).then((res) => {
                    if ("error" in res) setNote(res.error);
                    else {
                      setConfirmId(null);
                      onChanged();
                    }
                  });
                }}
              >
                Confirm 24 hours
              </button>
            ) : (
              <button type="button" className="btn-ghost flex-1" onClick={() => setConfirmId(hero.id)}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      {heroes.length < 6 ? (
        <button type="button" className="btn w-full" onClick={onCreate}>
          Create a hero
        </button>
      ) : null}
    </div>
  );
}

function ResetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(token ? "" : "That reset link is no longer good.");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card w-full max-w-sm space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!token) return;
        if (password.length < 8) {
          setError("Password needs at least 8 characters.");
          return;
        }
        setBusy(true);
        setError("");
        void fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newPassword: password, token }),
        })
          .then(async (res) => {
            if (!res.ok) {
              setError("That reset link is no longer good.");
              return;
            }
            onDone();
          })
          .catch(() => setError("That reset link is no longer good."))
          .finally(() => setBusy(false));
      }}
    >
      <h1 className="font-display text-xl text-gold">New password</h1>
      <input className="field" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error ? <p className="text-sm text-crimson">{error}</p> : null}
      <button className="btn w-full" type="submit" disabled={busy || !token}>
        {busy ? "One moment…" : "Change password"}
      </button>
      <button type="button" className="btn-ghost w-full" onClick={onDone}>
        Back to login
      </button>
    </form>
  );
}

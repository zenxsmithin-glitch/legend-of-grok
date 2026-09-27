import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Hermy & Champo's Norse Adventure";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#140e18" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Nunito:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var AC = window.AudioContext || window.webkitAudioContext;
              if (!AC || window.__midgardAudio) return;
              try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
              var ctx = new AC();
              var master = ctx.createGain();
              master.gain.value = 1;
              master.connect(ctx.destination);
              var keep = ctx.createGain();
              keep.gain.value = 0.00001;
              keep.connect(master);
              var osc = ctx.createOscillator();
              osc.frequency.value = 880;
              osc.connect(keep);
              try { osc.start(); } catch (e) {}
              window.__midgardAudio = ctx;
              window.__midgardMaster = master;
              var resume = function(){ if (ctx.state !== "running") { var p = ctx.resume(); if (p && p.catch) p.catch(function(){}); } };
              resume();
              ["pointerdown","pointerup","touchstart","touchend","keydown","click"].forEach(function(ev){
                window.addEventListener(ev, resume, true);
              });
              setInterval(resume, 500);
            })();`,
          }}
        />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});

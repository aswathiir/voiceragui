"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// Scroll-driven 3D tilt (21st.dev @aceternity/container-scroll-animation),
// adapted to work inside the dashboard's inner scroll container: content
// starts tilted back and straightens as it scrolls into view. Listens on the
// nearest scrollable ancestor since the app scrolls <main>, not the window.

export function ContainerScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let scroller: HTMLElement | null = el.parentElement;
    while (scroller && scroller !== document.body) {
      const { overflowY } = getComputedStyle(scroller);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scroller = scroller.parentElement;
    }

    const update = () => {
      const viewH = scroller ? scroller.clientHeight : window.innerHeight;
      const top = el.getBoundingClientRect().top - (scroller?.getBoundingClientRect().top ?? 0);
      // 0 when the element enters from the bottom, 1 once its top reaches 40% of the view
      const p = Math.min(1, Math.max(0, 1 - (top - viewH * 0.4) / (viewH * 0.6)));
      progress.set(p);
    };

    update();
    const target = scroller ?? window;
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [progress]);

  const smooth = useSpring(progress, { stiffness: 120, damping: 24 });
  const rotateX = useTransform(smooth, [0, 1], [18, 0]);
  const scale = useTransform(smooth, [0, 1], [0.96, 1]);
  const opacity = useTransform(smooth, [0, 1], [0.6, 1]);

  return (
    <div ref={ref} style={{ perspective: "1100px" }}>
      <motion.div style={{ rotateX, scale, opacity, transformOrigin: "center top" }}>
        {children}
      </motion.div>
    </div>
  );
}

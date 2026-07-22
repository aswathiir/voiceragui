"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Phone, Clock, MessageSquare, BarChart2, Settings } from "lucide-react";

type IconType = React.ElementType<{ className?: string }>;

export interface InteractiveMenuItem {
  label: string;
  icon: IconType;
  href?: string;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
  onSelect?: (index: number, item: InteractiveMenuItem) => void;
  activeIndex?: number;
}

const DEFAULT_ITEMS: InteractiveMenuItem[] = [
  { label: "Call", icon: Phone, href: "/dashboard/call" },
  { label: "History", icon: Clock, href: "/dashboard/history" },
  { label: "Chat", icon: MessageSquare, href: "/dashboard/chat" },
  { label: "Logs", icon: BarChart2, href: "/dashboard/logs" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export function InteractiveMenu({
  items,
  accentColor,
  onSelect,
  activeIndex: controlledActive,
}: InteractiveMenuProps) {
  const finalItems = useMemo(() => {
    const valid = items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    return valid ? items! : DEFAULT_ITEMS;
  }, [items]);

  const [internalActive, setInternalActive] = useState(0);
  const active = controlledActive ?? internalActive;

  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = itemRefs.current[active];
    const txt = textRefs.current[active];
    if (el && txt) {
      el.style.setProperty("--lineWidth", `${txt.offsetWidth}px`);
    }
    const onResize = () => {
      const e2 = itemRefs.current[active];
      const t2 = textRefs.current[active];
      if (e2 && t2) e2.style.setProperty("--lineWidth", `${t2.offsetWidth}px`);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, finalItems]);

  const navStyle = useMemo(
    () =>
      ({
        "--component-active-color": accentColor ?? "var(--component-active-color-default)",
      }) as React.CSSProperties,
    [accentColor]
  );

  const handleClick = (i: number) => {
    setInternalActive(i);
    onSelect?.(i, finalItems[i]);
  };

  return (
    <nav className="menu" role="navigation" style={navStyle}>
      {finalItems.map((item, i) => {
        const Icon = item.icon;
        const isActive = i === active;
        return (
          <button
            key={item.label}
            ref={(el) => { itemRefs.current[i] = el; }}
            className={`menu__item${isActive ? " active" : ""}`}
            onClick={() => handleClick(i)}
            style={{ "--lineWidth": "0px" } as React.CSSProperties}
          >
            <div className="menu__icon">
              <Icon className="icon" />
            </div>
            <strong
              ref={(el) => { textRefs.current[i] = el; }}
              className={`menu__text${isActive ? " active" : ""}`}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
}

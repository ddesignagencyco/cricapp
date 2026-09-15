'use client';

import { useEffect, useRef } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const CLICK_ZOOM = 2.5;
const STEP = 0.25;

interface ImageZoomerProps {
  src: string;
  alt: string;
  zoom: number;
  onZoomChange: (_zoom: number) => void;
}

export default function ImageZoomer({ src, alt, zoom, onZoomChange }: ImageZoomerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const movedRef = useRef(false);
  const zoomed = zoom > 1.01;
  const size = `${Math.round(Math.max(1, zoom) * 100)}%`;

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const el = scrollerRef.current;
      if (!drag || !el) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      el.scrollLeft = drag.left - dx;
      el.scrollTop = drag.top - dy;
      el.style.cursor = 'grabbing';
    };
    const stop = () => {
      dragRef.current = null;
      const el = scrollerRef.current;
      if (el) el.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [src, zoom]);

  return (
    <div
      ref={scrollerRef}
      className="absolute inset-0 overflow-auto overscroll-contain"
      style={{ cursor: zoomed ? 'grab' : 'zoom-in' }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        movedRef.current = false;
        const el = scrollerRef.current;
        if (!el || !zoomed) return;
        dragRef.current = {
          x: event.clientX,
          y: event.clientY,
          left: el.scrollLeft,
          top: el.scrollTop,
        };
      }}
      onClick={() => {
        if (movedRef.current) return;
        if (!zoomed) onZoomChange(CLICK_ZOOM);
      }}
      onDoubleClick={() => {
        if (zoomed) onZoomChange(MIN_ZOOM);
      }}
    >
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
      </div>
    </div>
  );
}

export { MIN_ZOOM, MAX_ZOOM, CLICK_ZOOM, STEP };

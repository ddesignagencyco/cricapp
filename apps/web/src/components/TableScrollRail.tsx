'use client';

import { useEffect } from 'react';

/**
 * Touch devices ship overlay scrollbars that stay hidden until you flick, so a
 * wide table on a phone gives no hint that there is more to the right. This adds
 * a permanent, draggable rail under every horizontally scrollable table and
 * hides that table's native bar so there is exactly one scroll affordance.
 *
 * Tables are discovered at runtime rather than wrapped by hand, so tables that
 * mount later (pagination, client-side navigation) are picked up too.
 */
const HOST_ATTR = 'data-table-rail';
const RAIL_CLASS = 'table-scroll-rail';
const THUMB_CLASS = 'table-scroll-rail__thumb';

type Attachment = {
  scroller: HTMLElement;
  rail: HTMLElement;
  thumb: HTMLElement;
  teardown: () => void;
};

function scrollHost(table: HTMLElement): HTMLElement | null {
  const parent = table.parentElement;
  if (!parent) return null;
  const overflow = window.getComputedStyle(parent).overflowX;
  return overflow === 'auto' || overflow === 'scroll' ? parent : null;
}

function attach(table: HTMLElement, attachments: Set<Attachment>): void {
  const scroller = scrollHost(table);
  if (!scroller) return;
  if (scroller.getAttribute(HOST_ATTR) === 'on') return;
  if (!scroller.parentElement) return;
  scroller.setAttribute(HOST_ATTR, 'on');

  const rail = document.createElement('div');
  rail.className = RAIL_CLASS;
  rail.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('div');
  thumb.className = THUMB_CLASS;
  rail.appendChild(thumb);
  scroller.after(rail);

  let dragging = false;
  let grabOffset = 0;

  const sync = () => {
    const overflow = scroller.scrollWidth - scroller.clientWidth;
    if (overflow <= 1) {
      rail.dataset.state = 'idle';
      return;
    }
    rail.dataset.state = 'ready';
    const railWidth = rail.clientWidth || 1;
    const width = Math.max(28, Math.round(railWidth * (scroller.clientWidth / scroller.scrollWidth)));
    const travel = Math.max(0, railWidth - width);
    const offset = Math.round((scroller.scrollLeft / overflow) * travel);
    thumb.style.width = `${width}px`;
    thumb.style.transform = `translateX(${offset}px)`;
  };

  const scrollTo = (clientX: number) => {
    const rect = rail.getBoundingClientRect();
    const width = thumb.offsetWidth;
    const travel = Math.max(0, rect.width - width);
    if (travel <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - grabOffset) / travel));
    scroller.scrollLeft = ratio * (scroller.scrollWidth - scroller.clientWidth);
  };

  const onPointerDown = (event: PointerEvent) => {
    const thumbRect = thumb.getBoundingClientRect();
    const onThumb = event.clientX >= thumbRect.left && event.clientX <= thumbRect.right;
    if (onThumb) {
      grabOffset = event.clientX - thumbRect.left;
    } else {
      grabOffset = thumb.offsetWidth / 2;
      scrollTo(event.clientX);
    }
    dragging = true;
    rail.dataset.dragging = 'true';
    rail.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    scrollTo(event.clientX);
  };

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    delete rail.dataset.dragging;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
  };

  scroller.addEventListener('scroll', sync, { passive: true });
  rail.addEventListener('pointerdown', onPointerDown);
  rail.addEventListener('pointermove', onPointerMove);
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  const resize = new ResizeObserver(sync);
  resize.observe(scroller);
  resize.observe(table);
  const mutation = new MutationObserver(sync);
  mutation.observe(scroller, { childList: true, subtree: true, characterData: true });

  const frame = requestAnimationFrame(sync);
  window.addEventListener('resize', sync);

  const attachment: Attachment = {
    scroller,
    rail,
    thumb,
    teardown: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', sync);
      scroller.removeEventListener('scroll', sync);
      rail.removeEventListener('pointerdown', onPointerDown);
      rail.removeEventListener('pointermove', onPointerMove);
      rail.removeEventListener('pointerup', endDrag);
      rail.removeEventListener('pointercancel', endDrag);
      resize.disconnect();
      mutation.disconnect();
      scroller.removeAttribute(HOST_ATTR);
      rail.remove();
    },
  };
  attachments.add(attachment);
}

function sweep(attachments: Set<Attachment>): void {
  for (const table of Array.from(document.querySelectorAll('table'))) {
    attach(table as HTMLElement, attachments);
  }
}

export default function TableScrollRail() {
  useEffect(() => {
    const attachments = new Set<Attachment>();
    let queued = false;

    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sweep(attachments);
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const attachment of attachments) attachment.teardown();
      attachments.clear();
    };
  }, []);

  return null;
}

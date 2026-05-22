import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Magnetic button effect
export const useMagneticEffect = (ref, strength = 0.5) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      gsap.to(element, {
        x: deltaX,
        y: deltaY,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, strength]);
};

// Parallax scroll effect
export const useParallax = (ref, speed = 0.5) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const y = progress * 100 * speed;
        gsap.set(element, { y });
      }
    });

    return () => trigger.kill();
  }, [ref, speed]);
};

// Reveal animation on scroll
export const useRevealOnScroll = (ref, options = {}) => {
  const {
    y = 100,
    opacity = 0,
    duration = 1,
    delay = 0,
    start = 'top 80%',
    markers = false
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.set(element, { y, opacity });

    const animation = gsap.to(element, {
      y: 0,
      opacity: 1,
      duration,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: element,
        start,
        markers,
        toggleActions: 'play none none reverse'
      }
    });

    return () => {
      animation.kill();
      animation.scrollTrigger?.kill();
    };
  }, [ref, y, opacity, duration, delay, start, markers]);
};

// Stagger children animation
export const useStaggerReveal = (containerRef, childSelector, options = {}) => {
  const {
    y = 60,
    opacity = 0,
    duration = 0.8,
    stagger = 0.1,
    start = 'top 80%'
  } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = container.querySelectorAll(childSelector);

    gsap.set(children, { y, opacity });

    const animation = gsap.to(children, {
      y: 0,
      opacity: 1,
      duration,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start,
        toggleActions: 'play none none reverse'
      }
    });

    return () => {
      animation.kill();
      animation.scrollTrigger?.kill();
    };
  }, [containerRef, childSelector, y, opacity, duration, stagger, start]);
};

// Split text animation
export const splitTextAnimation = (element, options = {}) => {
  const { duration = 0.8, stagger = 0.03, y = 100, ease = 'power4.out' } = options;

  const text = element.textContent;
  element.innerHTML = '';

  const chars = text.split('').map((char, i) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.display = 'inline-block';
    span.style.opacity = '0';
    span.style.transform = `translateY(${y}%) rotateX(-90deg)`;
    element.appendChild(span);
    return span;
  });

  return gsap.to(chars, {
    opacity: 1,
    y: 0,
    rotateX: 0,
    duration,
    stagger,
    ease
  });
};

// Cursor glow effect
export const useCursorGlow = (containerRef, glowRef) => {
  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.to(glow, {
        x: x - glow.offsetWidth / 2,
        y: y - glow.offsetHeight / 2,
        duration: 0.5,
        ease: 'power2.out'
      });
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [containerRef, glowRef]);
};

// Horizontal scroll section
export const useHorizontalScroll = (containerRef) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = container.querySelectorAll('.horizontal-section');
    const totalWidth = sections.length * window.innerWidth;

    const scroll = gsap.to(sections, {
      x: -totalWidth + window.innerWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        pin: true,
        scrub: 1,
        end: () => `+=${totalWidth}`,
        invalidateOnRefresh: true
      }
    });

    return () => scroll.kill();
  }, [containerRef]);
};

// Smooth counter animation
export const useCountUp = (ref, end, duration = 2, start = 0) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const obj = { value: start };

    gsap.to(obj, {
      value: end,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = Math.floor(obj.value).toLocaleString();
      }
    });
  }, [ref, end, duration, start]);
};

export default {
  useMagneticEffect,
  useParallax,
  useRevealOnScroll,
  useStaggerReveal,
  splitTextAnimation,
  useCursorGlow,
  useHorizontalScroll,
  useCountUp
};
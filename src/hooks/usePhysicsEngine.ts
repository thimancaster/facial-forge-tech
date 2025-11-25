import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

export const usePhysicsEngine = (isActive: boolean) => {
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [originalPositions, setOriginalPositions] = useState<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    if (!isActive) {
      // Cleanup physics and restore original positions
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      if (renderRef.current) {
        Matter.Render.stop(renderRef.current);
        renderRef.current = null;
      }

      // Restore DOM elements to original positions
      originalPositions.forEach((rect, id) => {
        const element = document.getElementById(id);
        if (element) {
          element.style.transform = '';
          element.style.position = '';
          element.style.left = '';
          element.style.top = '';
          element.style.transition = 'all 0.5s ease-out';
        }
      });

      return;
    }

    // Initialize physics engine
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });

    engineRef.current = engine;

    const elementsToPhysics = [
      'navbar',
      'hero-title',
      'hero-subtitle', 
      'hero-cta',
      'floating-card-0',
      'floating-card-1',
      'floating-card-2',
    ];

    const bodies: Matter.Body[] = [];
    const positions = new Map<string, DOMRect>();

    elementsToPhysics.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      positions.set(id, rect);

      // Create physics body
      const body = Matter.Bodies.rectangle(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        rect.width,
        rect.height,
        {
          restitution: 0.6,
          friction: 0.1,
          frictionAir: 0.01,
          render: { fillStyle: 'transparent' },
        }
      );

      body.label = id;
      bodies.push(body);

      // Convert element to absolute positioning
      element.style.position = 'fixed';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.transition = 'none';
    });

    setOriginalPositions(positions);

    // Add bodies to world
    Matter.World.add(engine.world, bodies);

    // Create ground and walls
    const ground = Matter.Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight + 50,
      window.innerWidth,
      100,
      { isStatic: true }
    );

    const leftWall = Matter.Bodies.rectangle(
      -50,
      window.innerHeight / 2,
      100,
      window.innerHeight,
      { isStatic: true }
    );

    const rightWall = Matter.Bodies.rectangle(
      window.innerWidth + 50,
      window.innerHeight / 2,
      100,
      window.innerHeight,
      { isStatic: true }
    );

    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // Mouse control
    const mouse = Matter.Mouse.create(document.body);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });

    Matter.World.add(engine.world, mouseConstraint);

    // Update loop
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Sync DOM with physics
    const syncInterval = setInterval(() => {
      bodies.forEach((body) => {
        const element = document.getElementById(body.label);
        if (element) {
          element.style.transform = `translate(${body.position.x - originalPositions.get(body.label)!.width / 2 - originalPositions.get(body.label)!.left}px, ${body.position.y - originalPositions.get(body.label)!.height / 2 - originalPositions.get(body.label)!.top}px) rotate(${body.angle}rad)`;
        }
      });
    }, 1000 / 60);

    return () => {
      clearInterval(syncInterval);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [isActive]);

  return { isActive };
};

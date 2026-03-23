import { useEffect, useState, type ComponentType, type PropsWithChildren } from 'react';

export const PageMotion = ({ children }: PropsWithChildren) => {
  const [MotionDiv, setMotionDiv] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let active = true;

    import('motion/react').then((module) => {
      if (!active) return;
      setMotionDiv(() => module.motion.div);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!MotionDiv) {
    return <div className="page-motion">{children}</div>;
  }

  return (
    <MotionDiv
      className="page-motion"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </MotionDiv>
  );
};

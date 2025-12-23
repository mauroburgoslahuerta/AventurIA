import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const CustomConfetti = () => {
    const [pieces] = useState(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        y: -20 - Math.random() * 100, // Start above screen
        color: ['#06b6d4', '#ec4899', '#fbbf24', '#10b981'][Math.floor(Math.random() * 4)],
        size: 5 + Math.random() * 10,
        rotate: Math.random() * 360,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 2
    })));

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {pieces.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ top: `${p.y}%`, left: `${p.x}%`, opacity: 1, rotate: p.rotate }}
                    animate={{ top: '120%', rotate: p.rotate + 720, opacity: 0 }}
                    transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
                    style={{ position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color }}
                />
            ))}
        </div>
    );
};

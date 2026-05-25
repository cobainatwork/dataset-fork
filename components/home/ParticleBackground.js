'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';

export default function ParticleBackground() {
  const canvasRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mousePosition = { x: 0, y: 0 };
    let hoverRadius = 150; // 增加滑鼠影響範圍
    let mouseSpeed = { x: 0, y: 0 }; // 跟蹤滑鼠速度
    let lastMousePosition = { x: 0, y: 0 }; // 上一幀滑鼠位置

    // 設定畫布大小為視窗大小
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    // 跟蹤滑鼠位置和速度
    const handleMouseMove = event => {
      // 計算滑鼠速度
      mouseSpeed.x = event.clientX - mousePosition.x;
      mouseSpeed.y = event.clientY - mousePosition.y;

      // 更新滑鼠位置
      lastMousePosition.x = mousePosition.x;
      lastMousePosition.y = mousePosition.y;
      mousePosition.x = event.clientX;
      mousePosition.y = event.clientY;
    };

    // 觸控裝置支援
    const handleTouchMove = event => {
      if (event.touches.length > 0) {
        // 計算觸控速度
        mouseSpeed.x = event.touches[0].clientX - mousePosition.x;
        mouseSpeed.y = event.touches[0].clientY - mousePosition.y;

        // 更新觸控位置
        lastMousePosition.x = mousePosition.x;
        lastMousePosition.y = mousePosition.y;
        mousePosition.x = event.touches[0].clientX;
        mousePosition.y = event.touches[0].clientY;
      }
    };

    // 生成隨機顏色
    const getRandomColor = () => {
      // 主題色調
      const colors =
        theme.palette.mode === 'dark'
          ? [
              'rgba(255, 255, 255, 0.5)', // 白色
              'rgba(100, 181, 246, 0.5)', // 藍色
              'rgba(156, 39, 176, 0.4)', // 紫色
              'rgba(121, 134, 203, 0.5)' // 靛藍色
            ]
          : [
              'rgba(42, 92, 170, 0.5)', // 主藍色
              'rgba(66, 165, 245, 0.4)', // 淺藍色
              'rgba(94, 53, 177, 0.3)', // 深紫色
              'rgba(3, 169, 244, 0.4)' // 天藍色
            ];

      return colors[Math.floor(Math.random() * colors.length)];
    };

    // 初始化粒子
    const initParticles = () => {
      particles = [];
      // 增加粒子數量，但保持效能平衡
      const particleCount = Math.min(Math.floor(window.innerWidth / 8), 150);

      for (let i = 0; i < particleCount; i++) {
        // 建立不同大小和速度的粒子
        const size = Math.random();
        const speedFactor = Math.max(0.1, size); // 較大的粒子移動較慢

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // 粒子大小更加多樣化
          radius: size * 3 + 0.5,
          // 使用隨機顏色
          color: getRandomColor(),
          // 添加發光效果
          glow: Math.random() * 10 + 5,
          // 調整速度範圍，使運動更加自然
          speedX: (Math.random() * 0.6 - 0.3) * speedFactor,
          speedY: (Math.random() * 0.6 - 0.3) * speedFactor,
          originalSpeedX: (Math.random() * 0.6 - 0.3) * speedFactor,
          originalSpeedY: (Math.random() * 0.6 - 0.3) * speedFactor,
          // 新增脈動效果
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseDirection: Math.random() > 0.5 ? 1 : -1,
          pulseAmount: 0,
          // 粒子透明度
          opacity: Math.random() * 0.5 + 0.5
        });
      }
    };

    // 繪製粒子
    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 計算滑鼠速度衰減
      mouseSpeed.x *= 0.95;
      mouseSpeed.y *= 0.95;

      // 繪製粒子之間的連線
      drawLines();

      particles.forEach(particle => {
        // 計算粒子與滑鼠的距離
        const dx = mousePosition.x - particle.x;
        const dy = mousePosition.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 脈動效果
        particle.pulseAmount += particle.pulseSpeed * particle.pulseDirection;
        if (Math.abs(particle.pulseAmount) > 0.5) {
          particle.pulseDirection *= -1;
        }

        // 如果粒子在滑鼠影響範圍內，調整其速度
        if (distance < hoverRadius) {
          const angle = Math.atan2(dy, dx);
          const force = (hoverRadius - distance) / hoverRadius;
          const mouseFactor = 3; // 增強滑鼠影響力度

          // 粒子遠離滑鼠，並受滑鼠速度影響
          particle.speedX = -Math.cos(angle) * force * mouseFactor + particle.originalSpeedX + mouseSpeed.x * 0.05;
          particle.speedY = -Math.sin(angle) * force * mouseFactor + particle.originalSpeedY + mouseSpeed.y * 0.05;
        } else {
          // 逐漸恢復原始速度
          particle.speedX = particle.speedX * 0.95 + particle.originalSpeedX * 0.05;
          particle.speedY = particle.speedY * 0.95 + particle.originalSpeedY * 0.05;
        }

        // 更新粒子位置
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // 邊界檢查
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // 應用脈動效果到粒子大小
        const currentRadius = particle.radius * (1 + particle.pulseAmount * 0.2);

        // 繪製發光效果
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.glow);
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // 繪製粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // 添加發光效果
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.glow, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.3 * particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    // 繪製粒子之間的連線
    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 增加連線的最大距離
          const maxDistance = 120;

          if (distance < maxDistance) {
            // 只在粒子距離小於maxDistance時繪製連線
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            // 根據距離設定線條透明度
            const opacity = 1 - distance / maxDistance;

            // 根據主題設定線條顏色
            const lineColor =
              theme.palette.mode === 'dark'
                ? `rgba(255, 255, 255, ${opacity * 0.2})`
                : `rgba(42, 92, 170, ${opacity * 0.2})`;

            ctx.strokeStyle = lineColor;
            ctx.lineWidth = opacity * 1.5; // 根據距離調整線寬
            ctx.stroke();
          }
        }
      }
    };

    // 初始化
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    // 開始動畫
    drawParticles();

    // 清理函式
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme.palette.mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // 確保不會干擾下方元素的互動
        zIndex: 0
      }}
    />
  );
}

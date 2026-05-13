/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. 核心：定义 Tailwind 扫描的文件路径
  // ** 表示递归目录，{...} 表示匹配多种后缀
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // 如果你以后有 src 目录，取消下面一行的注释
    // "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  // 2. 启用深色模式（通过 class 切换，或者设为 'media' 跟随系统）
  darkMode: 'class',

  theme: {
    // 3. 扩展自定义配置
    extend: {
      // 可以在这里定义你的品牌色
      colors: {
        radio: {
          primary: '#3b82f6', // 蓝色
          bg: '#f8fafc',      // 浅灰蓝背景
        },
      },
      // 这里的动画可以配合你 page.js 里的 animate-spin 使用
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
    
    // 4. 这里的配置让你的 .container 类始终水平居中并有内边距
    container: {
      center: true,
      padding: '1rem',
    },
  },

  // 5. 常用插件（如果需要可以安装后开启）
  plugins: [
    // require('@tailwindcss/forms'),      // 优化表单样式
    // require('@tailwindcss/typography'), // 优化长文章样式
  ],
}

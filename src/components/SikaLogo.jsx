import logoSika from '../assets/logo.png';

const SikaLogo = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { width: 80, height: 80 },
    md: { width: 120, height: 120 },
    lg: { width: 160, height: 160 },
    xl: { width: 200, height: 200 }
  };

  const { width, height } = sizes[size] || sizes.md;

  return (
    <div className={`relative ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
      <img 
        src={logoSika} 
        alt="SIKA INDUSTRIE" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        }}
      />
    </div>
  );
};

export default SikaLogo;

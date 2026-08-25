import logo from '../images/Logo_Gateway.png';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={`brand ${className ?? ''}`}>
      <img src={logo} alt="Lera Pay" className="brand-logo-img" />
      <span className="brand-text">
        <span className="brand-name-lera">Lera</span><span className="brand-name-pay">Pay</span>
      </span>
    </div>
  );
}

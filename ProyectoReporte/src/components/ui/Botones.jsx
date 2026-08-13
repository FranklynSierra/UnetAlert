
export default function Botones({onClick,disabled,texto,type,className = ""}) {
  return (
   
      <button
       className={`btn fw-bold text-uppercase py-2 ${className}`}
        type={type}
        disabled={disabled}
       onClick={onClick}
      >
       {texto}
      </button>
    
  )
}

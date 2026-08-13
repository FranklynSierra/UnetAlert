
export default function Input({required=true,value,onChange,multiple=false,placeholder,accept,type,disabled,className = ""}) {
  return (
   <input required={required} type={type} 
               className={`form-control  border-secondary text-uppercase ${className}` }
               placeholder={placeholder}
              disabled={disabled}
              
               onChange={onChange}
               value={value}
               multiple={multiple}
               accept={accept}
             />
  )
}

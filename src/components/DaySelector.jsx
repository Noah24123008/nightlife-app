export default function DaySelector({ dias, indiceSeleccionado, onSeleccionar }) {
  return (
    <div className="day-selector">
      {dias.map((dia, index) => (
        <button
          key={dia.fechaISO}
          type="button"
          className={`day-pill ${index === indiceSeleccionado ? 'day-pill--activo' : ''}`}
          onClick={() => onSeleccionar(index)}
        >
          {dia.etiqueta}
        </button>
      ))}
    </div>
  )
}

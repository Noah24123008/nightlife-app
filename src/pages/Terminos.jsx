import { Link, useNavigate } from 'react-router-dom'
import { VERSION_TERMINOS } from '../lib/legal'

export default function Terminos() {
  const navigate = useNavigate()

  // Mismo patrón ya usado por BackButton.jsx: ver Privacidad.jsx.
  function handleVolver() {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="legal-page">
      <button type="button" onClick={handleVolver} className="legal-page-volver">
        ← Volver
      </button>

      <h1 className="legal-page-titulo">Términos de uso</h1>
      <p className="legal-page-meta">Versión {VERSION_TERMINOS}</p>

      <p className="legal-page-nota">
        Este documento está en fase de beta y contiene datos por completar, marcados entre corchetes. No sustituye
        asesoramiento legal profesional.
      </p>

      <h2>Qué es NoctUp</h2>
      <p>
        NoctUp es una aplicación para descubrir dónde sale la gente, ver dónde van tus amigos, y consultar locales y
        eventos. Actualmente se encuentra en fase de beta, con un número limitado de personas usándola.
      </p>

      <h2>Uso personal</h2>
      <p>
        NoctUp está pensada para uso personal, no comercial. Cada cuenta debe corresponder a una persona real y no
        compartirse.
      </p>

      <h2>Edad mínima</h2>
      <p>NoctUp está dirigido a personas mayores de 18 años. Al crear una cuenta, confirmas que cumples este requisito.</p>

      <h2>Uso indebido</h2>
      <p>Al usar NoctUp, te comprometes a no:</p>
      <ul>
        <li>Crear cuentas falsas o suplantar a otra persona.</li>
        <li>Acosar, amenazar o molestar a otros usuarios.</li>
        <li>Enviar spam o usar la app con fines comerciales no autorizados.</li>
        <li>Intentar acceder a datos o funciones que no te correspondan.</li>
      </ul>

      <h2>Sobre «quién va» y la asistencia</h2>
      <p>
        Cuando indicas «Voy» a un local o evento, estás expresando una intención o un plan — no es una confirmación
        verificada de que vayas a estar físicamente presente, ni NoctUp garantiza el aforo real de ningún local. Los
        números de asistencia que muestra la app reflejan planes declarados por los usuarios, no un recuento
        verificado.
      </p>

      <h2>Locales y eventos</h2>
      <p>
        La información sobre locales y eventos puede cambiar o cancelarse sin previo aviso por parte del propio
        establecimiento u organizador. NoctUp no garantiza la exactitud, disponibilidad ni continuidad de esta
        información.
      </p>

      <h2>Tu responsabilidad</h2>
      <p>
        Eres responsable del contenido que publicas (nombre, foto de perfil) y de tu actividad dentro de la app.
        NoctUp no se hace responsable de las interacciones entre usuarios fuera de la aplicación.
      </p>

      <h2>Suspensión de cuentas</h2>
      <p>
        NoctUp puede suspender o eliminar cuentas que incumplan estos términos, especialmente en casos de abuso,
        acoso o uso fraudulento, sin perjuicio de tu derecho a eliminar tu cuenta en cualquier momento desde Perfil.
      </p>

      <h2>Cambios en estos términos</h2>
      <p>
        Si estos términos cambian de forma relevante, se actualizará el número de versión indicado arriba y, si ya
        tienes cuenta, se te pedirá aceptarlos de nuevo la próxima vez que abras la app.
      </p>

      <h2>Contacto</h2>
      <p>Para cualquier duda sobre estos términos, escribe a noctup00@gmail.com.</p>

      <p className="legal-page-enlace-final">
        Consulta también la <Link to="/privacidad">Política de privacidad</Link>.
      </p>
    </div>
  )
}

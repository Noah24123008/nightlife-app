import { Link } from 'react-router-dom'
import { VERSION_PRIVACIDAD } from '../lib/legal'

export default function Privacidad() {
  return (
    <div className="legal-page">
      <Link to="/login" className="legal-page-volver">
        ← Volver
      </Link>

      <h1 className="legal-page-titulo">Política de privacidad</h1>
      <p className="legal-page-meta">Versión {VERSION_PRIVACIDAD}</p>

      <p className="legal-page-nota">
        Este documento está en fase de beta y contiene datos por completar, marcados entre corchetes. No sustituye
        asesoramiento legal profesional.
      </p>

      <h2>Responsable del tratamiento</h2>
      <p>
        [NOMBRE DEL RESPONSABLE], con domicilio en [DOMICILIO O DATOS QUE PROCEDAN], es responsable del tratamiento
        de los datos personales recogidos a través de NoctUp. Puedes contactar en [EMAIL DE CONTACTO].
      </p>

      <h2>Qué datos recoge NoctUp</h2>
      <ul>
        <li>Datos de cuenta: email y contraseña (la contraseña se gestiona de forma cifrada por Supabase Auth; NoctUp nunca la ve en texto plano).</li>
        <li>Datos de perfil: nombre, nombre de usuario, foto de perfil (opcional).</li>
        <li>Actividad en la app: locales y eventos a los que indicas «Voy», y la fecha.</li>
        <li>Relaciones sociales: solicitudes de amistad y amistades aceptadas.</li>
        <li>Notificaciones generadas por tu actividad y la de tus amigos.</li>
        <li>Datos técnicos básicos necesarios para el funcionamiento de la app (por ejemplo, la sesión activa).</li>
      </ul>

      <h2>Para qué se usan</h2>
      <ul>
        <li>Prestar el servicio: mostrarte dónde va la gente, quién de tus amigos asiste, notificaciones y búsqueda de perfiles.</li>
        <li>Mantener tu cuenta y tu sesión.</li>
        <li>Corregir errores y mejorar la aplicación durante esta fase de beta.</li>
      </ul>

      <h2>Base jurídica</h2>
      <p>
        El tratamiento se basa principalmente en la ejecución del contrato que aceptas al crear una cuenta y usar
        NoctUp (los Términos de uso), y en el interés legítimo de mantener el servicio funcionando de forma segura.
        Algunas funciones concretas, si las hubiera, podrían basarse en tu consentimiento específico para esa
        función — nunca en un consentimiento genérico que cubra todo el tratamiento descrito aquí.
      </p>

      <h2>Cuánto tiempo se conservan</h2>
      <p>
        Tus datos se conservan mientras mantengas tu cuenta activa. Si eliminas tu cuenta desde Perfil, tus datos
        personales y de actividad se eliminan según se describe en la sección «Eliminar mi cuenta» de la propia
        aplicación.
      </p>

      <h2>Con quién se comparten</h2>
      <p>
        NoctUp no vende tus datos ni los comparte con terceros con fines publicitarios. Para funcionar, se apoya en
        proveedores tecnológicos que tratan datos en su nombre, como encargados del tratamiento:
      </p>
      <ul>
        <li>Supabase — base de datos, autenticación y almacenamiento de archivos.</li>
        <li>Vercel — alojamiento de la aplicación.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad, limitación y oposición sobre
        tus datos personales. Puedes ejercerlos directamente desde Perfil (editar tus datos, eliminar tu cuenta) o
        escribiendo a [EMAIL DE CONTACTO].
      </p>

      <h2>Edad mínima</h2>
      <p>NoctUp está dirigido a personas mayores de 18 años.</p>

      <h2>Cambios en esta política</h2>
      <p>
        Si esta política cambia de forma relevante, se actualizará el número de versión indicado arriba y, si ya
        tienes cuenta, se te pedirá confirmar que la has leído la próxima vez que abras la app.
      </p>
    </div>
  )
}

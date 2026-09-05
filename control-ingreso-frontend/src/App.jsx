import { useState, useEffect } from 'react'

function App() {
  const [mensaje, setMensaje] = useState('cargando...')

  useEffect(() => {
    fetch('http://localhost:8080/api/ping')
      .then((res) => res.text())
      .then((data) => setMensaje(data))
      .catch(() => setMensaje('error al conectar con el backend'))
  }, [])

  return (
    <div className="bg-blue-500 text-white p-4 text-2xl">
      Respuesta del backend: {mensaje}
    </div>
  )
}

export default App
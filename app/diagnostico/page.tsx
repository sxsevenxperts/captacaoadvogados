import { redirect } from 'next/navigation'

/**
 * O diagnóstico deixou de ter página própria: ele vive dentro da landing,
 * na seção #diagnostico. A rota continua existindo só para não quebrar
 * links já divulgados.
 */
export default function PaginaDiagnostico() {
  redirect('/#diagnostico')
}

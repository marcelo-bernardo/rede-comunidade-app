export const soDigitos = (s: string) => (s ?? '').replace(/\D/g, '')

/** Valida CPF pelos dígitos verificadores. */
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const dv = (fatia: string, pesoInicial: number) => {
    let soma = 0
    for (let i = 0; i < fatia.length; i++) soma += Number(fatia[i]) * (pesoInicial - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10])
}

/** Valida CNPJ (o MEI também tem CNPJ) pelos dígitos verificadores. */
export function cnpjValido(valor: string): boolean {
  const cnpj = soDigitos(valor)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const dv = (base: string) => {
    const pesos =
      base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = pesos.reduce((acc, p, i) => acc + Number(base[i]) * p, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return dv(cnpj.slice(0, 12)) === Number(cnpj[12]) && dv(cnpj.slice(0, 13)) === Number(cnpj[13])
}

/** NIS/PIS: 11 dígitos com dígito verificador. */
export function nisValido(valor: string): boolean {
  const nis = soDigitos(valor)
  if (nis.length !== 11 || /^(\d)\1{10}$/.test(nis)) return false
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const soma = pesos.reduce((acc, p, i) => acc + Number(nis[i]) * p, 0)
  const resto = 11 - (soma % 11)
  return (resto >= 10 ? 0 : resto) === Number(nis[10])
}

import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../src/store/AuthStore'
import { Botao, Card, Campo, FundoGradiente } from '../src/components/ui'

/**
 * Aberta pelo link do e-mail (rede-comunidade://redefinir-senha?token=...)
 * ou manualmente, colando o código recebido.
 */
export default function RedefinirSenha() {
  const params = useLocalSearchParams<{ token?: string }>()
  const router = useRouter()
  const { redefinirSenha } = useAuth()

  const [token, setToken] = useState(params.token ?? '')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar() {
    if (!token.trim()) return Alert.alert('Erro', 'Cole o código recebido por e-mail.')
    if (senha.length < 6) return Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.')
    if (senha !== confirmar) return Alert.alert('Erro', 'As senhas não coincidem.')

    setEnviando(true)
    const r = await redefinirSenha(token, senha)
    setEnviando(false)
    if (!r.ok) return Alert.alert('Erro', r.erro ?? 'Não foi possível redefinir a senha.')
    Alert.alert('Senha alterada', 'Entre com a nova senha.', [
      { text: 'OK', onPress: () => router.replace('/login') },
    ])
  }

  return (
    <FundoGradiente>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={s.titulo}>Criar nova senha</Text>
          {!params.token && (
            <Campo label="Código recebido por e-mail">
              <TextInput style={s.input} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
            </Campo>
          )}
          <Campo label="Nova senha">
            <TextInput style={s.input} value={senha} onChangeText={setSenha} secureTextEntry />
          </Campo>
          <Campo label="Confirmar nova senha">
            <TextInput style={s.input} value={confirmar} onChangeText={setConfirmar} secureTextEntry />
          </Campo>
          <Botao titulo={enviando ? 'Salvando...' : 'Salvar nova senha'} onPress={salvar} disabled={enviando} />
        </Card>
      </ScrollView>
    </FundoGradiente>
  )
}

const s = StyleSheet.create({
  content: { padding: 16 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#065f46', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
})

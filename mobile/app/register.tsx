import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/store/AuthStore'
import { ESCOLARIDADES } from '../src/lib/types'

function IconeCasa({ cor = '#065f46', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: tamanho * 0.5, borderRightWidth: tamanho * 0.5, borderBottomWidth: tamanho * 0.35, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: cor }} />
      <View style={{ width: tamanho * 0.6, height: tamanho * 0.4, backgroundColor: cor, marginTop: tamanho * 0.02 }}>
        <View style={{ position: 'absolute', bottom: 0, left: '50%', transform: [{ translateX: -tamanho * 0.12 }], width: tamanho * 0.24, height: tamanho * 0.22, backgroundColor: '#fff' }} />
      </View>
    </View>
  )
}

function IconeUsuario({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.45, height: tamanho * 0.45, borderRadius: (tamanho * 0.45) / 2, backgroundColor: cor, marginBottom: tamanho * 0.08 }} />
      <View style={{ width: tamanho * 0.75, height: tamanho * 0.32, borderRadius: (tamanho * 0.75) / 2, backgroundColor: cor }} />
    </View>
  )
}

function IconeEmail({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.85, height: tamanho * 0.6, borderRadius: tamanho * 0.08, borderWidth: 1.8, borderColor: cor }}>
        <View style={{ position: 'absolute', top: -1, left: -1, width: 0, height: 0, borderLeftWidth: tamanho * 0.43, borderRightWidth: tamanho * 0.43, borderTopWidth: tamanho * 0.32, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: cor }} />
      </View>
    </View>
  )
}

function IconeCpf({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.7, height: tamanho * 0.85, borderRadius: tamanho * 0.08, borderWidth: 1.8, borderColor: cor, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <View style={{ width: tamanho * 0.3, height: 1.5, backgroundColor: cor }} />
        <View style={{ width: tamanho * 0.3, height: 1.5, backgroundColor: cor }} />
        <View style={{ width: tamanho * 0.3, height: 1.5, backgroundColor: cor }} />
      </View>
    </View>
  )
}

function IconeTelefone({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.45, height: tamanho * 0.75, borderRadius: tamanho * 0.12, borderWidth: 1.8, borderColor: cor, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: tamanho * 0.08 }}>
        <View style={{ width: tamanho * 0.2, height: tamanho * 0.06, borderRadius: tamanho * 0.03, backgroundColor: cor }} />
      </View>
    </View>
  )
}

function IconeLocal({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.5, height: tamanho * 0.5, borderRadius: (tamanho * 0.5) / 2, borderWidth: 1.8, borderColor: cor, marginBottom: tamanho * 0.05 }}>
        <View style={{ position: 'absolute', bottom: -tamanho * 0.35, left: '50%', transform: [{ translateX: -tamanho * 0.18 }], width: 0, height: 0, borderLeftWidth: tamanho * 0.18, borderRightWidth: tamanho * 0.18, borderBottomWidth: tamanho * 0.3, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: cor }} />
      </View>
    </View>
  )
}

function IconeCadeado({ cor = '#94a3b8', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: tamanho * 0.45, height: tamanho * 0.35, borderTopLeftRadius: tamanho * 0.22, borderTopRightRadius: tamanho * 0.22, borderWidth: 2.2, borderBottomWidth: 0, borderColor: cor }} />
      <View style={{ width: tamanho * 0.7, height: tamanho * 0.42, borderRadius: tamanho * 0.08, backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: tamanho * 0.12, height: tamanho * 0.12, borderRadius: tamanho * 0.06, backgroundColor: '#fff', marginTop: tamanho * 0.04 }} />
      </View>
    </View>
  )
}

function IconeAlerta({ cor = '#dc2626', tamanho = 18 }: { cor?: string; tamanho?: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: tamanho * 0.48, borderRightWidth: tamanho * 0.48, borderBottomWidth: tamanho * 0.85, borderBottomColor: cor, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
      <View style={{ position: 'absolute', width: 2, height: tamanho * 0.35, backgroundColor: '#fff', top: tamanho * 0.3 }} />
      <View style={{ position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: '#fff', top: tamanho * 0.7 }} />
    </View>
  )
}

function calcularForcaSenha(senha: string): { pontos: number; rotulo: string; cor: string } {
  let pontos = 0
  if (senha.length >= 6) pontos++
  if (senha.length >= 8) pontos++
  if (/[A-Z]/.test(senha)) pontos++
  if (/[0-9]/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha)) pontos++

  if (pontos <= 1) return { pontos, rotulo: 'Fraca', cor: '#dc2626' }
  if (pontos <= 2) return { pontos, rotulo: 'Razoável', cor: '#ea580c' }
  if (pontos <= 3) return { pontos, rotulo: 'Boa', cor: '#eab308' }
  if (pontos <= 4) return { pontos, rotulo: 'Forte', cor: '#22c55e' }
  return { pontos, rotulo: 'Muito Forte', cor: '#16a34a' }
}

export default function RegisterScreen() {
  const router = useRouter()
  const { register } = useAuth()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  type MembroFamilia = { id: string; nome: string; idade: string; escolaridade: string }
  const [membrosFamilia, setMembrosFamilia] = useState<MembroFamilia[]>([])
  const [membroNome, setMembroNome] = useState('')
  const [membroIdade, setMembroIdade] = useState('')
  const [membroEscolaridade, setMembroEscolaridade] = useState('')
  const [modalEscolaridade, setModalEscolaridade] = useState(false)

  const scale = screenWidth / 390
  const fontScale = Math.min(scale, 1.2)
  const horizontalMargin = screenWidth * 0.06

  function formatarCpf(text: string) {
    const apenasNumeros = text.replace(/\D/g, '').slice(0, 11)
    let formatado = apenasNumeros
    if (apenasNumeros.length > 3) formatado = apenasNumeros.slice(0, 3) + '.' + apenasNumeros.slice(3)
    if (apenasNumeros.length > 6) formatado = formatado.slice(0, 7) + '.' + apenasNumeros.slice(6)
    if (apenasNumeros.length > 9) formatado = formatado.slice(0, 11) + '-' + apenasNumeros.slice(9)
    setCpf(formatado)
  }

  function formatarTelefone(text: string) {
    const apenasNumeros = text.replace(/\D/g, '').slice(0, 11)
    let formatado = apenasNumeros
    if (apenasNumeros.length > 2) formatado = `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`
    if (apenasNumeros.length > 7) formatado = `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`
    setTelefone(formatado)
  }

  async function handleRegister() {
    setErro('')

    if (!nome.trim() || !email.trim() || !cpf.trim() || !rua.trim() || !senha.trim()) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    const resultado = await register({
      nome: nome.trim(),
      email: email.trim(),
      cpf,
      telefone,
      rua: rua.trim(),
      senha,
      composicaoFamiliar: membrosFamilia.map((m) => ({
        nome: m.nome,
        idade: Number(m.idade),
        escolaridade: m.escolaridade,
      })),
    })
    setCarregando(false)

    if (!resultado.ok) {
      setErro(resultado.erro || 'Erro ao realizar cadastro.')
      return
    }

    Alert.alert(
      'Cadastro realizado com sucesso!',
      'Aguarde a aprovação da diretoria para acessar o aplicativo. Você receberá acesso assim que a Presidente validar seu cadastro.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ],
    )
  }

  function adicionarMembro() {
    if (!membroNome.trim()) {
      Alert.alert('Erro', 'Digite o nome do familiar.')
      return
    }
    if (!membroIdade.trim() || Number(membroIdade) < 0 || Number(membroIdade) > 150) {
      Alert.alert('Erro', 'Digite uma idade válida (0-150).')
      return
    }
    if (!membroEscolaridade) {
      Alert.alert('Erro', 'Selecione a escolaridade do familiar.')
      return
    }
    setMembrosFamilia([
      ...membrosFamilia,
      {
        id: `mf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nome: membroNome.trim(),
        idade: membroIdade,
        escolaridade: membroEscolaridade,
      },
    ])
    setMembroNome('')
    setMembroIdade('')
    setMembroEscolaridade('')
  }

  function removerMembro(id: string) {
    setMembrosFamilia(membrosFamilia.filter((m) => m.id !== id))
  }

  const isFocused = (field: string) => focusedField === field

  return (
    <KeyboardAvoidingView
      style={s.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={['#065f46', '#047857', '#059669', '#34d399']}
        style={StyleSheet.absoluteFill}
      />

      {/* Círculos decorativos (bokeh) */}
      <View style={[s.bgCircle, { width: 200 * scale, height: 200 * scale, borderRadius: 100 * scale, top: -40 * scale, right: -60 * scale, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[s.bgCircle, { width: 150 * scale, height: 150 * scale, borderRadius: 75 * scale, top: 80 * scale, left: -50 * scale, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      <View style={[s.bgCircle, { width: 100 * scale, height: 100 * scale, borderRadius: 50 * scale, bottom: 120 * scale, right: -30 * scale, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.bgCircle, { width: 180 * scale, height: 180 * scale, borderRadius: 90 * scale, bottom: -40 * scale, left: -40 * scale, backgroundColor: 'rgba(255,255,255,0.03)' }]} />
      <View style={[s.bgCircle, { width: 60 * scale, height: 60 * scale, borderRadius: 30 * scale, top: screenHeight * 0.3, left: 40 * scale, backgroundColor: 'rgba(255,255,255,0.07)' }]} />
      <View style={[s.bgCircle, { width: 120 * scale, height: 120 * scale, borderRadius: 60 * scale, top: screenHeight * 0.55, right: 60 * scale, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      <View style={[s.bgCircle, { width: 80 * scale, height: 80 * scale, borderRadius: 40 * scale, top: screenHeight * 0.7, left: -20 * scale, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.bgCircle, { width: 45 * scale, height: 45 * scale, borderRadius: 22.5 * scale, top: screenHeight * 0.18, right: 100 * scale, backgroundColor: 'rgba(255,255,255,0.08)' }]} />

      {/* Anéis concêntricos */}
      <View style={[s.bgRing, { width: 160 * scale, height: 160 * scale, borderRadius: 80 * scale, top: screenHeight * 0.05, left: -60 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[s.bgRing, { width: 120 * scale, height: 120 * scale, borderRadius: 60 * scale, top: screenHeight * 0.05 + 20 * scale, left: -40 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[s.bgRing, { width: 200 * scale, height: 200 * scale, borderRadius: 100 * scale, bottom: screenHeight * 0.1, right: -80 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.bgRing, { width: 140 * scale, height: 140 * scale, borderRadius: 70 * scale, bottom: screenHeight * 0.1 + 30 * scale, right: -50 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }]} />

      {/* Linhas decorativas */}
      <View style={[s.bgLine, { width: 120 * scale, height: 1, top: screenHeight * 0.15, left: -20 * scale, transform: [{ rotate: '25deg' }], backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[s.bgLine, { width: 80 * scale, height: 1, top: screenHeight * 0.25, right: 20 * scale, transform: [{ rotate: '-15deg' }], backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[s.bgLine, { width: 150 * scale, height: 1, bottom: screenHeight * 0.3, left: 30 * scale, transform: [{ rotate: '35deg' }], backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.bgLine, { width: 100 * scale, height: 1, bottom: screenHeight * 0.2, right: -10 * scale, transform: [{ rotate: '-20deg' }], backgroundColor: 'rgba(255,255,255,0.07)' }]} />
      <View style={[s.bgLine, { width: 90 * scale, height: 1, top: screenHeight * 0.42, left: 50 * scale, transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[s.bgLine, { width: 70 * scale, height: 1, top: screenHeight * 0.6, right: 70 * scale, transform: [{ rotate: '-30deg' }], backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.bgLine, { width: 110 * scale, height: 1, bottom: screenHeight * 0.45, left: -10 * scale, transform: [{ rotate: '20deg' }], backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      <View style={[s.bgLine, { width: 60 * scale, height: 1, top: screenHeight * 0.72, left: 100 * scale, transform: [{ rotate: '-40deg' }], backgroundColor: 'rgba(255,255,255,0.06)' }]} />

      {/* Pontos decorativos */}
      <View style={[s.bgDot, { width: 6 * scale, height: 6 * scale, borderRadius: 3 * scale, top: screenHeight * 0.12, left: 60 * scale, backgroundColor: 'rgba(255,255,255,0.15)' }]} />
      <View style={[s.bgDot, { width: 4 * scale, height: 4 * scale, borderRadius: 2 * scale, top: screenHeight * 0.2, right: 80 * scale, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
      <View style={[s.bgDot, { width: 5 * scale, height: 5 * scale, borderRadius: 2.5 * scale, top: screenHeight * 0.35, left: 30 * scale, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
      <View style={[s.bgDot, { width: 7 * scale, height: 7 * scale, borderRadius: 3.5 * scale, bottom: screenHeight * 0.25, right: 50 * scale, backgroundColor: 'rgba(255,255,255,0.13)' }]} />
      <View style={[s.bgDot, { width: 4 * scale, height: 4 * scale, borderRadius: 2 * scale, bottom: screenHeight * 0.15, left: 80 * scale, backgroundColor: 'rgba(255,255,255,0.11)' }]} />
      <View style={[s.bgDot, { width: 5 * scale, height: 5 * scale, borderRadius: 2.5 * scale, top: screenHeight * 0.5, right: 40 * scale, backgroundColor: 'rgba(255,255,255,0.09)' }]} />
      <View style={[s.bgDot, { width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale, top: screenHeight * 0.08, right: 120 * scale, backgroundColor: 'rgba(255,255,255,0.14)' }]} />
      <View style={[s.bgDot, { width: 3 * scale, height: 3 * scale, borderRadius: 1.5 * scale, top: screenHeight * 0.65, left: 110 * scale, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
      <View style={[s.bgDot, { width: 6 * scale, height: 6 * scale, borderRadius: 3 * scale, bottom: screenHeight * 0.35, left: 20 * scale, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
      <View style={[s.bgDot, { width: 4 * scale, height: 4 * scale, borderRadius: 2 * scale, bottom: screenHeight * 0.08, right: 100 * scale, backgroundColor: 'rgba(255,255,255,0.11)' }]} />
      <View style={[s.bgDot, { width: 5 * scale, height: 5 * scale, borderRadius: 2.5 * scale, top: screenHeight * 0.82, left: 60 * scale, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[s.bgDot, { width: 7 * scale, height: 7 * scale, borderRadius: 3.5 * scale, top: screenHeight * 0.38, right: 25 * scale, backgroundColor: 'rgba(255,255,255,0.1)' }]} />

      {/* Formas geométricas */}
      <View style={[s.bgHex, { width: 40 * scale, height: 40 * scale, top: screenHeight * 0.08, right: 30 * scale, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', transform: [{ rotate: '45deg' }] }]} />
      <View style={[s.bgHex, { width: 30 * scale, height: 30 * scale, top: screenHeight * 0.45, left: 15 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', transform: [{ rotate: '30deg' }] }]} />
      <View style={[s.bgHex, { width: 50 * scale, height: 50 * scale, bottom: screenHeight * 0.35, right: 20 * scale, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', transform: [{ rotate: '60deg' }] }]} />
      <View style={[s.bgHex, { width: 25 * scale, height: 25 * scale, bottom: screenHeight * 0.18, left: 50 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', transform: [{ rotate: '15deg' }] }]} />
      <View style={[s.bgHex, { width: 35 * scale, height: 35 * scale, top: screenHeight * 0.62, right: 90 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', transform: [{ rotate: '50deg' }] }]} />
      <View style={[s.bgHex, { width: 20 * scale, height: 20 * scale, top: screenHeight * 0.28, left: 90 * scale, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', transform: [{ rotate: '70deg' }] }]} />

      {/* Sinais de mais (+) */}
      <View style={[s.bgPlus, { top: screenHeight * 0.22, left: 100 * scale }]}>
        <View style={[s.bgPlusH, { width: 14 * scale, height: 1.5 * scale, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[s.bgPlusV, { width: 1.5 * scale, height: 14 * scale, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
      </View>
      <View style={[s.bgPlus, { top: screenHeight * 0.58, right: 30 * scale }]}>
        <View style={[s.bgPlusH, { width: 10 * scale, height: 1 * scale, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[s.bgPlusV, { width: 1 * scale, height: 10 * scale, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      </View>
      <View style={[s.bgPlus, { bottom: screenHeight * 0.4, left: 15 * scale }]}>
        <View style={[s.bgPlusH, { width: 12 * scale, height: 1.5 * scale, backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={[s.bgPlusV, { width: 1.5 * scale, height: 12 * scale, backgroundColor: 'rgba(255,255,255,0.07)' }]} />
      </View>
      <View style={[s.bgPlus, { bottom: screenHeight * 0.12, right: 70 * scale }]}>
        <View style={[s.bgPlusH, { width: 8 * scale, height: 1 * scale, backgroundColor: 'rgba(255,255,255,0.09)' }]} />
        <View style={[s.bgPlusV, { width: 1 * scale, height: 8 * scale, backgroundColor: 'rgba(255,255,255,0.09)' }]} />
      </View>

      {/* Triângulos */}
      <View style={[s.bgTri, { top: screenHeight * 0.32, right: 55 * scale, borderLeftWidth: 8 * scale, borderRightWidth: 8 * scale, borderBottomWidth: 14 * scale, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[s.bgTri, { bottom: screenHeight * 0.28, left: 70 * scale, borderLeftWidth: 6 * scale, borderRightWidth: 6 * scale, borderBottomWidth: 10 * scale, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,255,255,0.05)', transform: [{ rotate: '180deg' }] }]} />
      <View style={[s.bgTri, { top: screenHeight * 0.68, right: 110 * scale, borderLeftWidth: 5 * scale, borderRightWidth: 5 * scale, borderBottomWidth: 8 * scale, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(255,255,255,0.07)' }]} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: horizontalMargin, paddingTop: screenHeight * 0.04, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={[s.logoContainer, { width: 70 * scale, height: 70 * scale, borderRadius: 20 * scale, alignSelf: 'center', marginBottom: 10 * scale }]}>
          <View style={[s.logo, { width: 54 * scale, height: 54 * scale, borderRadius: 16 * scale }]}>
            <IconeCasa cor="#047857" tamanho={26 * scale} />
          </View>
        </View>

        <Text style={[s.titulo, { fontSize: 28 * fontScale }]}>Rede Comunidade</Text>
        <Text style={[s.subtitulo, { fontSize: 11 * fontScale, marginTop: 2 * scale }]}>
          Sistema de Apoio à Gestão Comunitária
        </Text>

        {/* Card principal */}
        <View style={[s.card, { marginTop: 14 * scale, padding: 18 * scale }]}>
          {/* Ícone central */}
          <View style={[s.usuarioContainer, { width: 64 * scale, height: 64 * scale, borderRadius: 32 * scale, alignSelf: 'center', marginBottom: 10 * scale }]}>
            <IconeUsuario cor="#059669" tamanho={32 * scale} />
          </View>

          <Text style={[s.cardTitulo, { fontSize: 22 * fontScale }]}>Criar Conta</Text>
          <Text style={[s.cardSubtitulo, { fontSize: 11 * fontScale, marginBottom: 14 * scale }]}>
            Preencha seus dados para solicitar acesso
          </Text>

          {/* Erro */}
          {erro ? (
            <View style={[s.erroContainer, { marginBottom: 10 * scale, padding: 10 * scale }]}>
              <IconeAlerta cor="#fca5a5" tamanho={14 * scale} />
              <Text style={[s.erroTexto, { fontSize: 11 * fontScale }]}>{erro}</Text>
            </View>
          ) : null}

          {/* Nome */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('nome') && s.inputRowFocused]}>
            <IconeUsuario cor={isFocused('nome') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome completo *"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('nome')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Email */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('email') && s.inputRowFocused]}>
            <IconeEmail cor={isFocused('email') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail *"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* CPF */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('cpf') && s.inputRowFocused]}>
            <IconeCpf cor={isFocused('cpf') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={cpf}
              onChangeText={formatarCpf}
              placeholder="CPF *"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              maxLength={14}
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('cpf')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Telefone */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('telefone') && s.inputRowFocused]}>
            <IconeTelefone cor={isFocused('telefone') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={telefone}
              onChangeText={formatarTelefone}
              placeholder="Telefone"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={15}
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('telefone')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Endereço */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('rua') && s.inputRowFocused]}>
            <IconeLocal cor={isFocused('rua') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={rua}
              onChangeText={setRua}
              placeholder="Rua / Endereço *"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('rua')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Senha */}
          <View style={[s.inputRow, { marginBottom: 4 * scale, paddingHorizontal: 10 * scale }, isFocused('senha') && s.inputRowFocused]}>
            <IconeCadeado cor={isFocused('senha') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha * (mínimo 6 caracteres)"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('senha')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Força da senha */}
          {senha.length > 0 && (
            <View style={[s.senhaForca, { marginBottom: 8 * scale, paddingHorizontal: 4 * scale }]}>
              <View style={s.senhaForcaBarras}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      s.senhaForcaBarra,
                      {
                        backgroundColor:
                          i <= calcularForcaSenha(senha).pontos
                            ? calcularForcaSenha(senha).cor
                            : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.senhaForcaRotulo, { color: calcularForcaSenha(senha).cor, fontSize: 10 * fontScale }]}>
                {calcularForcaSenha(senha).rotulo}
              </Text>
            </View>
          )}

          {/* Confirmar Senha */}
          <View style={[s.inputRow, { marginBottom: 8 * scale, paddingHorizontal: 10 * scale }, isFocused('confirmarSenha') && s.inputRowFocused]}>
            <IconeCadeado cor={isFocused('confirmarSenha') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Confirmar senha *"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('confirmarSenha')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* ── Composição Familiar ── */}
          <View style={[s.familiaDivider, { marginVertical: 12 * scale }]}>
            <View style={s.familiaDividerLinha} />
            <Text style={[s.familiaDividerTexto, { fontSize: 11 * fontScale }]}>Composição Familiar</Text>
            <View style={s.familiaDividerBadge}>
              <Text style={[s.familiaDividerBadgeText, { fontSize: 9 * fontScale }]}>Opcional</Text>
            </View>
            <View style={s.familiaDividerLinha} />
          </View>

          <Text style={[s.familiaDescricao, { fontSize: 11 * fontScale, marginBottom: 10 * scale }]}>
            Adicione os membros da sua família (nome, idade e escolaridade).
          </Text>

          {/* Formulário de novo membro */}
          <View style={[s.inputRow, { marginBottom: 6 * scale, paddingHorizontal: 10 * scale }, isFocused('membroNome') && s.inputRowFocused]}>
            <IconeUsuario cor={isFocused('membroNome') ? '#059669' : '#9ca3af'} tamanho={16 * scale} />
            <TextInput
              style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, marginLeft: 8 * scale }]}
              value={membroNome}
              onChangeText={setMembroNome}
              placeholder="Nome do familiar"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              underlineColorAndroid="transparent"
              selectionColor="#10b981"
              onFocus={() => setFocusedField('membroNome')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.membroRow}>
            <View style={[s.inputRow, { flex: 1, paddingHorizontal: 10 * scale }, isFocused('membroIdade') && s.inputRowFocused]}>
              <TextInput
                style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale }]}
                value={membroIdade}
                onChangeText={(t) => setMembroIdade(t.replace(/\D/g, '').slice(0, 3))}
                placeholder="Idade"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={3}
                underlineColorAndroid="transparent"
                selectionColor="#10b981"
                onFocus={() => setFocusedField('membroIdade')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[s.inputRow, { flex: 2, paddingHorizontal: 10 * scale }, isFocused('membroEscolaridade') && s.inputRowFocused]}
              onPress={() => setModalEscolaridade(true)}
              activeOpacity={0.7}
            >
              <Text style={[s.inputTexto, { paddingVertical: 10 * scale, fontSize: 13 * fontScale, color: membroEscolaridade ? '#1f2937' : '#9ca3af' }]}>
                {membroEscolaridade || 'Escolaridade'}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>▾</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btnAdicionar, { marginTop: 6 * scale, paddingVertical: 10 * scale, borderRadius: 12 * scale }]}
            onPress={adicionarMembro}
            activeOpacity={0.7}
          >
            <Text style={[s.btnAdicionarTexto, { fontSize: 13 * fontScale }]}>+ Adicionar familiar</Text>
          </TouchableOpacity>

          {/* Lista de membros adicionados */}
          {membrosFamilia.length > 0 && (
            <View style={[s.membrosLista, { marginTop: 10 * scale }]}>
              {membrosFamilia.map((m) => (
                <View key={m.id} style={[s.membroCard, { padding: 10 * scale, borderRadius: 12 * scale }]}>
                  <View style={s.membroCardInfo}>
                    <View style={s.membroCardAvatar}>
                      <IconeUsuario cor="#059669" tamanho={16 * scale} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.membroCardNome, { fontSize: 13 * fontScale }]}>{m.nome}</Text>
                      <Text style={[s.membroCardDetalhe, { fontSize: 11 * fontScale }]}>
                        {m.idade} {Number(m.idade) === 1 ? 'ano' : 'anos'} · {m.escolaridade}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removerMembro(m.id)} style={s.membroCardRemove}>
                      <Text style={s.membroCardRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Modal Picker Escolaridade */}
          <Modal visible={modalEscolaridade} transparent animationType="fade">
            <TouchableOpacity
              style={s.pickerOverlay}
              activeOpacity={1}
              onPress={() => setModalEscolaridade(false)}
            >
              <View style={s.pickerModal}>
                <Text style={[s.pickerTitulo, { fontSize: 15 * fontScale }]}>Escolaridade</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {ESCOLARIDADES.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.pickerOption, membroEscolaridade === opt && s.pickerOptionAtivo]}
                      onPress={() => {
                        setMembroEscolaridade(opt)
                        setModalEscolaridade(false)
                      }}
                    >
                      <Text style={[s.pickerOptionText, membroEscolaridade === opt && s.pickerOptionTextAtivo]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Botão cadastrar */}
          <TouchableOpacity
            style={[s.botaoEntrar, { marginTop: 4 * scale }]}
            onPress={handleRegister}
            disabled={carregando}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#065f46', '#047857']}
              style={[s.botaoEntrarGradient, { paddingVertical: 13 * scale, borderRadius: 14 * scale }]}
            >
              {carregando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[s.botaoEntrarTexto, { fontSize: 14 * fontScale }]}>Solicitar Acesso</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Separador */}
          <View style={[s.separador, { marginVertical: 10 * scale, gap: 10 * scale }]}>
            <View style={s.separadorLinha} />
            <Text style={[s.separadorTexto, { fontSize: 11 * fontScale }]}>ou</Text>
            <View style={s.separadorLinha} />
          </View>

          {/* Link login */}
          <TouchableOpacity
            style={[s.botaoVoltar, { paddingVertical: 11 * scale, borderRadius: 14 * scale }]}
            onPress={() => router.replace('/login')}
            activeOpacity={0.7}
          >
            <Text style={[s.botaoVoltarTexto, { fontSize: 13 * fontScale }]}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.footer, { fontSize: 10 * fontScale, marginTop: 10 * scale }]}>v1.0.0 · Rede Comunidade</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  bgCircle: { position: 'absolute' },
  bgRing: { position: 'absolute' },
  bgLine: { position: 'absolute' },
  bgDot: { position: 'absolute' },
  bgHex: { position: 'absolute', borderRadius: 4 },
  bgPlus: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bgPlusH: { position: 'absolute' },
  bgPlusV: { position: 'absolute' },
  bgTri: { position: 'absolute', width: 0, height: 0 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  titulo: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitulo: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  usuarioContainer: {
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: {
    fontWeight: '800',
    color: '#065f46',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  cardSubtitulo: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  erroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    gap: 8,
  },
  erroTexto: {
    color: '#dc2626',
    flex: 1,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  inputRowFocused: {
    backgroundColor: '#fff',
    borderColor: '#10b981',
  },
  inputTexto: {
    flex: 1,
    color: '#1f2937',
  },
  senhaForca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senhaForcaBarras: {
    flexDirection: 'row',
    flex: 1,
    gap: 3,
  },
  senhaForcaBarra: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  senhaForcaRotulo: {
    fontWeight: '600',
    minWidth: 55,
  },
  botaoEntrar: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    elevation: 8,
  },
  botaoEntrarGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  botaoEntrarTexto: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separadorLinha: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  separadorTexto: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  botaoVoltar: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  botaoVoltarTexto: {
    color: '#10b981',
    fontWeight: '600',
  },
  footer: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  familiaDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familiaDividerLinha: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  familiaDividerTexto: {
    color: '#fff',
    fontWeight: '700',
  },
  familiaDividerBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  familiaDividerBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  familiaDescricao: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  membroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  btnAdicionar: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  btnAdicionarTexto: {
    color: '#065f46',
    fontWeight: '700',
  },
  membrosLista: {
    gap: 6,
  },
  membroCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  membroCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  membroCardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membroCardNome: {
    color: '#1f2937',
    fontWeight: '600',
  },
  membroCardDetalhe: {
    color: '#6b7280',
    marginTop: 1,
  },
  membroCardRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membroCardRemoveText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  pickerTitulo: {
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  pickerOptionAtivo: {
    backgroundColor: '#ecfdf5',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#334155',
  },
  pickerOptionTextAtivo: {
    color: '#059669',
    fontWeight: '600',
  },
})

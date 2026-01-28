import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { useApp } from '../contexts/AppContext';

import { useToast } from '../contexts/ToastContext';
type SupportScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Support'>;
};

const SUPPORT_OPTIONS = [
  { id: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366', action: 'whatsapp' },
  { id: 'email', icon: 'mail', label: 'Email', color: COLORS.primary, action: 'email' },
  { id: 'phone', icon: 'call', label: 'Telefone', color: '#2196F3', action: 'phone' },
];

const FAQ_ITEMS = [
  { question: 'Como me inscrevo em um evento?', answer: 'Acesse a página do evento, selecione a categoria desejada e clique em "Inscrever-se". Siga as instruções para completar sua inscrição.' },
  { question: 'Como cancelo minha inscrição?', answer: 'Acesse "Minhas Inscrições" no menu do perfil, encontre o evento e clique em "Cancelar Inscrição". Verifique a política de reembolso do evento.' },
  { question: 'Onde vejo meus resultados?', answer: 'Após a conclusão do evento, seus resultados estarão disponíveis em "Meus Resultados" no menu do perfil.' },
  { question: 'Como altero meus dados pessoais?', answer: 'Acesse "Dados Pessoais" no menu do perfil para editar suas informações.' },
  { question: 'Como funciona o sistema de vouchers?', answer: 'Vouchers são códigos de desconto que podem ser aplicados durante a inscrição. Digite o código no campo apropriado para obter o desconto.' },
];

export default function SupportScreen({ navigation }: SupportScreenProps) {
  const { showToast } = useToast();
  const { user } = useApp();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleContact = (action: string) => {
    switch (action) {
      case 'whatsapp':
        Linking.openURL('https://wa.me/5511999999999?text=Olá, preciso de ajuda com o app Sou Esporte');
        break;
      case 'email':
        Linking.openURL('mailto:suporte@souesporte.com.br?subject=Suporte App');
        break;
      case 'phone':
        Linking.openURL('tel:+5511999999999');
        break;
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      showToast('Por favor, preencha o assunto e a mensagem.', 'info');
      return;
    }

    setSending(true);
    
    // Simulate sending message
    setTimeout(() => {
      setSending(false);
      showToast('Mensagem enviada! Responderemos em até 24 horas úteis.', 'success');
      setSubject('');
      setMessage('');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato Rápido</Text>
          <View style={styles.contactOptions}>
            {SUPPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.contactOption}
                onPress={() => handleContact(option.action)}
              >
                <View style={[styles.contactIcon, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon as any} size={24} color={COLORS.white} />
                </View>
                <Text style={styles.contactLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
          <View style={styles.faqContainer}>
            {FAQ_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </View>
                {expandedFaq === index && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enviar Mensagem</Text>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assunto</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Ex: Problema com inscrição"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mensagem</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Descreva seu problema ou dúvida..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.background} />
                  <Text style={styles.sendButtonText}>Enviar Mensagem</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contactOption: {
    alignItems: 'center',
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  contactLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  faqContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  faqItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    ...FONTS.body3,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  faqAnswer: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...FONTS.body3,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  sendButtonText: {
    ...FONTS.body3,
    color: COLORS.background,
    fontWeight: '600',
  },
});

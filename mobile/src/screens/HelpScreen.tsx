import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';

type HelpScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Help'>;
};

const HELP_SECTIONS = [
  {
    title: 'Primeiros Passos',
    icon: 'rocket',
    items: [
      { title: 'Como criar uma conta', content: 'Na tela de login, toque em "Criar conta". Preencha seus dados pessoais, incluindo nome, email e senha. Após confirmar, você receberá acesso completo ao app.' },
      { title: 'Como fazer login', content: 'Digite seu email e senha na tela de login. Se esqueceu sua senha, toque em "Esqueci minha senha" para recuperá-la.' },
      { title: 'Navegação básica', content: 'Use a barra inferior para navegar entre Início, Eventos, Ranking, Ingressos e Perfil. Toque no ícone de menu para acessar mais opções.' },
    ]
  },
  {
    title: 'Eventos',
    icon: 'calendar',
    items: [
      { title: 'Encontrar eventos', content: 'Na tela Início, você verá eventos em destaque e próximos. Use a busca ou filtros para encontrar eventos específicos por esporte, data ou localização.' },
      { title: 'Detalhes do evento', content: 'Toque em um evento para ver informações completas: data, local, categorias, kits disponíveis, regulamento e percurso.' },
      { title: 'Compartilhar evento', content: 'Na página do evento, toque no ícone de compartilhar para enviar o evento para amigos via WhatsApp, email ou outras redes.' },
    ]
  },
  {
    title: 'Inscrições',
    icon: 'ticket',
    items: [
      { title: 'Como se inscrever', content: 'Na página do evento, selecione a categoria e kit desejados. Preencha seus dados, aplique um cupom de desconto se tiver, e confirme a inscrição.' },
      { title: 'Inscrição em equipe', content: 'Escolha "Inscrição em Equipe" e adicione os membros da sua equipe. Cada membro precisa ter seus dados preenchidos.' },
      { title: 'Usar cupom de desconto', content: 'Durante a inscrição, digite o código do cupom no campo "Cupom de Desconto" e toque em "Aplicar". O desconto será calculado automaticamente.' },
      { title: 'Cancelar inscrição', content: 'Acesse "Minhas Inscrições" no perfil, encontre o evento e toque em "Cancelar". Verifique a política de reembolso do organizador.' },
    ]
  },
  {
    title: 'Perfil',
    icon: 'person',
    items: [
      { title: 'Editar dados pessoais', content: 'Acesse "Dados Pessoais" no menu do perfil. Você pode alterar foto, nome, telefone, endereço e informações de emergência.' },
      { title: 'Ver resultados', content: 'Em "Meus Resultados" você encontra o histórico de todas as suas participações, tempos e posições.' },
      { title: 'Certificados', content: 'Após completar um evento, seu certificado estará disponível em "Certificados" para download.' },
    ]
  },
  {
    title: 'Organizadores',
    icon: 'briefcase',
    items: [
      { title: 'Modo Organizador', content: 'Se você é organizador de eventos, alterne para o Modo Organizador no perfil para acessar ferramentas de gestão.' },
      { title: 'Criar evento', content: 'No Modo Organizador, toque em "Criar Evento" e preencha todas as informações: nome, data, local, categorias, kits e regulamento.' },
      { title: 'Gerenciar inscritos', content: 'Acesse a lista de inscritos do seu evento para confirmar pagamentos, fazer check-in e gerenciar participantes.' },
      { title: 'Publicar resultados', content: 'Após o evento, acesse "Publicar Resultados" para inserir os tempos e posições dos participantes.' },
    ]
  },
];

export default function HelpScreen({ navigation }: HelpScreenProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="help-buoy" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Central de Ajuda</Text>
          <Text style={styles.introText}>
            Encontre respostas para suas dúvidas sobre o Sou Esporte
          </Text>
        </View>

        {/* Help Sections */}
        {HELP_SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === sectionIndex ? null : sectionIndex)}
            >
              <View style={styles.sectionLeft}>
                <View style={styles.sectionIcon}>
                  <Ionicons name={section.icon as any} size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Ionicons
                name={expandedSection === sectionIndex ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            
            {expandedSection === sectionIndex && (
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => {
                  const itemKey = `${sectionIndex}-${itemIndex}`;
                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      style={styles.helpItem}
                      onPress={() => setExpandedItem(expandedItem === itemKey ? null : itemKey)}
                    >
                      <View style={styles.helpItemHeader}>
                        <Text style={styles.helpItemTitle}>{item.title}</Text>
                        <Ionicons
                          name={expandedItem === itemKey ? 'remove' : 'add'}
                          size={18}
                          color={COLORS.primary}
                        />
                      </View>
                      {expandedItem === itemKey && (
                        <Text style={styles.helpItemContent}>{item.content}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Contact Support */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => navigation.navigate('Support')}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.background} />
          <Text style={styles.supportButtonText}>Não encontrou sua resposta? Fale conosco</Text>
        </TouchableOpacity>

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
  intro: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  introIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  introTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  introText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  helpItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  helpItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpItemTitle: {
    ...FONTS.body3,
    color: COLORS.text,
    flex: 1,
  },
  helpItemContent: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  supportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  supportButtonText: {
    ...FONTS.body3,
    color: COLORS.background,
    fontWeight: '600',
  },
});

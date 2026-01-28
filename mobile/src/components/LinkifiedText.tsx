import React from 'react';
import { Text, Linking, StyleSheet, TextStyle } from 'react-native';
import { COLORS } from '../constants/theme';

interface LinkifiedTextProps {
  text: string;
  style?: TextStyle;
  linkStyle?: TextStyle;
  numberOfLines?: number;
}

/**
 * Componente que detecta automaticamente URLs no texto e as torna clicáveis
 * Detecta formatos:
 * - https://exemplo.com
 * - http://exemplo.com
 * - www.exemplo.com
 * - Nike.com, google.com, instagram.com (domínios simples)
 */
export default function LinkifiedText({ 
  text, 
  style, 
  linkStyle,
  numberOfLines 
}: LinkifiedTextProps) {
  
  // Regex melhorada para detectar URLs em vários formatos
  // Detecta: https://, http://, www., ou qualquer palavra seguida de .com, .com.br, .net, .org, .io, etc
  // Agora detecta Nike.com, Google.com, etc (case insensitive)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-zA-Z][a-zA-Z0-9]*\.(?:com|com\.br|net|org|io|co|me|app|dev|br|pt|es|uk|us|eu|info|biz|tv|cc|xyz)(?:\.[a-zA-Z]{2,})?(?:\/[^\s]*)?)/gi;

  const handleLinkPress = async (url: string) => {
    // Adicionar protocolo se não existir
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    console.log('[LinkifiedText] Opening URL:', finalUrl);
    
    try {
      const canOpen = await Linking.canOpenURL(finalUrl);
      if (canOpen) {
        await Linking.openURL(finalUrl);
      } else {
        // Tentar abrir mesmo assim
        console.warn('canOpenURL returned false, trying anyway:', finalUrl);
        await Linking.openURL(finalUrl);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  // Se não houver texto, retornar vazio
  if (!text) {
    return <Text style={style} numberOfLines={numberOfLines}>{''}</Text>;
  }

  // Encontrar todas as URLs no texto
  const parts: { text: string; isLink: boolean }[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    // Adicionar texto antes do link
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isLink: false,
      });
    }
    
    // Adicionar o link
    parts.push({
      text: match[0],
      isLink: true,
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante após o último link
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isLink: false,
    });
  }

  // Se não encontrou nenhum link, retornar texto simples
  if (parts.length === 0) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.isLink) {
          return (
            <Text
              key={index}
              style={[styles.link, linkStyle]}
              onPress={() => handleLinkPress(part.text)}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={index}>{part.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

.error('[Automation] Erro ao enviar WhatsApp:', e);
      }
      return false;
    }
  }, []);

  // Enviar Email via n8n
  const sendEmail = useCallback(async (
    to: string,
    subject: string,
    _html: string
  ): Promise<boolean> => {
    try {
      await n8nMCPService.notifyStatusChangeEmail({
        demand_id: '',
        demand_title: subject,
        client_name: '',
        client_email: to,
        new_status: '',
      });
      return true;
    } catch (error) {
      console.error('[Automation] Erro ao enviar email:', error);
      return false;
    }
  }, []);

  // Quando uma demanda é criada
  const onDemandCreated = useCallback(async (demand: Demand) => {
    const client = getClient(demand.client_id);
    if (!client) return;

    const token = generateApprovalToken();
    const approvalLink = generateApprovalLink(demand.id, token);

    try {
      await n8nMCPService.notifyDemandCreated({
        demand_id: demand.id,
        demand_title: demand.title,
        client_name: client.name,
        client_email: client.email,
        client_phone: client.phone,
        content_type: demand.content_type,
        channels: demand.channels,
        approval_link: approvalLink,
      });

      addNotification({
        id: `notif_${Date.now()}`,
        title: 'Demanda Criada',
        message: `Nova demanda "${demand.title}" para ${client.name}`,
        type: 'success',
        demand_id: demand.id,
        created_at: new Date().toISOString(),
        read: false,
      });

      toast.success('Demanda criada e equipe notificada!');
    } catch (error) {
      console.error('[Automation] Erro ao processar criação de demanda:', error);
      toast.error('Erro ao notificar equipe');
    }
  }, [getClient, generateApprovalToken, generateApprovalLink, addNotification]);

  // Quando o status da demanda muda
  const onStatusChange = useCallback(async (
    demand: Demand,
    oldStatus: DemandStatus,
    newStatus: DemandStatus,
    updatedBy?: string
  ) => {
    const client = getClient(demand.client_id);
    if (!client) return;

    const config = STATUS_NOTIFICATIONS[newStatus];
    if (!config) return;

    try {
      let approvalLink: string | undefined;
      if (newStatus === 'aprovacao_cliente') {
        const token = generateApprovalToken();
        approvalLink = generateApprovalLink(demand.id, token);
      }

      await n8nMCPService.notifyStatusChangeEmail({
        demand_id: demand.id,
        demand_title: demand.title,
        client_name: client.name,
        client_email: client.email,
        new_status: newStatus,
        updated_by: updatedBy,
        approval_link: approvalLink,
      });

      if (config.notifyClient && client.phone && (config.type === 'whatsapp' || config.type === 'both')) {
        await sendWhatsApp(
          client.phone,
          `📢 *${config.message}*\n\n*${demand.title}*\n\n${approvalLink ? `🔗 Aprovar: ${approvalLink}` : ''}\n\n_BASE Agency_`,
          'status_update'
        );
      }

      addNotification({
        id: `notif_${Date.now()}`,
        title: 'Status Atualizado',
        message: `${demand.title}: ${oldStatus} → ${newStatus}`,
        type: 'info',
        demand_id: demand.id,
        created_at: new Date().toISOString(),
        read: false,
      });

    } catch (error) {
      console.error('[Automation] Erro ao processar mudança de status:', error);
    }
  }, [getClient, generateApprovalToken, generateApprovalLink, sendWhatsApp, addNotification]);

  // Quando cliente aprova
  const onClientApproval = useCallback(async (
    demand: Demand,
    approved: boolean,
    feedback?: string,
    approvedBy?: string
  ) => {
    try {
      await n8nMCPService.processClientApproval({
        demand_id: demand.id,
        token: '',
        action: approved ? 'approve' : 'request_adjustment',
        approved_by: approvedBy,
        feedback,
      });

      const message = approved
        ? `🎉 Demanda "${demand.title}" aprovada pelo cliente!`
        : `📝 Cliente solicitou ajustes em "${demand.title}"`;

      addNotification({
        id: `notif_${Date.now()}`,
        title: approved ? 'Demanda Aprovada' : 'Ajustes Solicitados',
        message,
        type: approved ? 'success' : 'warning',
        demand_id: demand.id,
        created_at: new Date().toISOString(),
        read: false,
      });

      toast.success(message);
    } catch (error) {
      console.error('[Automation] Erro ao processar aprovação:', error);
      toast.error('Erro ao processar aprovação');
    }
  }, [addNotification]);

  // Agendar publicação
  const schedulePublication = useCallback(async (
    demand: Demand,
    scheduledDate: string,
    scheduledBy?: string
  ) => {
    try {
      await n8nMCPService.schedulePublication({
        demand_id: demand.id,
        scheduled_date: scheduledDate,
        scheduled_by: scheduledBy,
      });

      const client = getClient(demand.client_id);
      if (client?.phone) {
        await sendWhatsApp(
          client.phone,
          `📅 *Publicação Agendada*\n\n*${demand.title}*\n\nData: ${new Date(scheduledDate).toLocaleString('pt-BR')}\n\n_BASE Agency_`,
          'status_update'
        );
      }

      addNotification({
        id: `notif_${Date.now()}`,
        title: 'Publicação Agendada',
        message: `${demand.title} agendado para ${new Date(scheduledDate).toLocaleString('pt-BR')}`,
        type: 'info',
        demand_id: demand.id,
        created_at: new Date().toISOString(),
        read: false,
      });

      toast.success('Publicação agendada com sucesso!');
    } catch (error) {
      console.error('[Automation] Erro ao agendar publicação:', error);
      toast.error('Erro ao agendar publicação');
    }
  }, [getClient, sendWhatsApp, addNotification]);

  // Publicar agora via Late API
  const publishNow = useCallback(async (demand: Demand): Promise<boolean> => {
    try {
      if (!lateAPI.isConfigured()) {
        throw new Error('Late API não configurada');
      }

      const content = {
        text: demand.ai_caption || demand.caption || demand.briefing || '',
        mediaUrls: demand.media?.map(m => m.url) || [],
      };

      const result = await lateAPI.publishNow({
        accountId: '',
        content,
        platform: demand.channels[0] || 'instagram',
      });

      if (result.status === 'published') {
        const client = getClient(demand.client_id);
        if (client?.phone) {
          await sendWhatsApp(
            client.phone,
            `🚀 *Seu conteúdo foi publicado!*\n\n*${demand.title}*\n\n${result.postUrl ? `🔗 ${result.postUrl}` : ''}\n\n_BASE Agency_`,
            'published'
          );
        }

        addNotification({
          id: `notif_${Date.now()}`,
          title: 'Publicação Realizada',
          message: `${demand.title} publicado com sucesso!`,
          type: 'success',
          demand_id: demand.id,
          created_at: new Date().toISOString(),
          read: false,
        });

        toast.success('Conteúdo publicado com sucesso!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Automation] Erro ao publicar:', error);
      toast.error('Erro ao publicar conteúdo');
      return false;
    }
  }, [getClient, sendWhatsApp, addNotification]);

  return {
    sendWhatsApp,
    sendEmail,
    onDemandCreated,
    onStatusChange,
    onClientApproval,
    schedulePublication,
    publishNow,
    generateApprovalLink,
    generateApprovalToken,
  };
}

export default useWorkflowAutomation;

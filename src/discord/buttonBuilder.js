// src/discord/buttonBuilder.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class DiscordButtonBuilder {
    /**
     * Create signup buttons for an event
     */
    static createSignupButtons(event) {
        if (!event.roles || event.roles.length === 0) return null;
        
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonsInRow = 0;
        
        event.roles.forEach((role, index) => {
            const signedUp = event.signups[role.name] || [];
            const isFull = role.maxSlots && signedUp.length >= role.maxSlots;
            
            const button = new ButtonBuilder()
                .setCustomId(`signup_${event.id}_${role.name}`)
                .setLabel(`${role.emoji || '👤'} ${role.name}`)
                .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(isFull);
            
            currentRow.addComponents(button);
            buttonsInRow++;
            
            // Discord limit: 5 buttons per row
            if (buttonsInRow === 5 || index === event.roles.length - 1) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonsInRow = 0;
            }
        });
        
        // Add leave button
        const leaveButton = new ButtonBuilder()
            .setCustomId(`leave_${event.id}`)
            .setLabel('❌ Leave Event')
            .setStyle(ButtonStyle.Danger);
        
        if (buttonsInRow === 0) {
            currentRow.addComponents(leaveButton);
            rows.push(currentRow);
        } else {
            rows[rows.length - 1].addComponents(leaveButton);
        }
        
        return rows;
    }
    
    /**
     * Parse button custom ID
     */
    static parseButtonId(customId) {
        let action, eventId, roleName;
        
        if (customId.startsWith('leave_')) {
            action = 'leave';
            eventId = customId.substring(6);
            roleName = null;
        } else if (customId.startsWith('signup_')) {
            action = 'signup';
            const withoutAction = customId.substring(7);
            const lastUnderscore = withoutAction.lastIndexOf('_');
            eventId = withoutAction.substring(0, lastUnderscore);
            roleName = withoutAction.substring(lastUnderscore + 1);
        } else {
            throw new Error('Unknown button action');
        }
        
        return { action, eventId, roleName };
    }
}

module.exports = DiscordButtonBuilder;

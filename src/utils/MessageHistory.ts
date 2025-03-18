interface Message {
    role: 'user' | 'assistant';
    content: string;
    imageContext?: string;
}

export class MessageHistory {
    private history: Map<string, Message[]> = new Map();
    private lastImage: Map<string, string> = new Map();
    
    addMessage(userId: string, role: 'user' | 'assistant', content: string) {
        if (!this.history.has(userId)) {
            this.history.set(userId, []);
        }
        this.history.get(userId)?.push({ role, content });
    }

    getHistory(userId: string, windowSize: number): Message[] {
        const userHistory = this.history.get(userId) || [];
        return userHistory.slice(-windowSize);
    }
 
    clearHistory(userId: string) {
        this.history.delete(userId);
    }

    setLastImage(userId: string, imagePath: string) {
        this.lastImage.set(userId, imagePath);
    }

    getLastImage(userId: string): string | undefined {
        return this.lastImage.get(userId);
    }

    removeLastImage(userId: string) {
        this.lastImage.delete(userId);
    }

    resetUserChat(userId: string) {
        this.clearHistory(userId);
        this.removeLastImage(userId);
    }
}

import React from 'react';
import { View, Text } from 'react-native';

export default function VerificationStatusScreen() {
    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
                Verification Status
            </Text>

            <Text>✔ Account age ≥ 30 days</Text>
            <Text>✔ Email or phone verified</Text>
            <Text>❌ At least 1,000 followers</Text>
            <Text>✔ Uploaded 5 videos</Text>
            <Text>✔ Active in last 14 days</Text>

            <Text style={{ marginTop: 20 }}>
                Almost there! Keep growing.
            </Text>
        </View>
    );
}
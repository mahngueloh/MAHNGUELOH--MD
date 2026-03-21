// pairing system code
const pairingSystem = () => {
    const users = [];

    const addUser = (user) => {
        if (!users.includes(user)) {
            users.push(user);
        }
    };

    const pairUsers = () => {
        const pairs = [];
        for (let i = 0; i < users.length; i += 2) {
            if (users[i + 1]) {
                pairs.push([users[i], users[i + 1]]);
            }
        }
        return pairs;
    };

    return {
        addUser,
        pairUsers
    };
};

module.exports = pairingSystem;
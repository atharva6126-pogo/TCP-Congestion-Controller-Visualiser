# Networking Notes

## Key Concepts

### Congestion Window (cwnd)
The amount of data a sender can transmit before waiting for an acknowledgement.

### Slow Start
TCP begins with a small congestion window and increases it exponentially until a threshold is reached.

### Congestion Avoidance
After the threshold, the congestion window grows linearly to avoid overloading the network.

### Fast Retransmit
TCP retransmits a packet after receiving duplicate ACKs, indicating packet loss.

### Fast Recovery
TCP reduces the congestion window after packet loss but avoids returning to the initial slow-start state.

### Round Trip Time (RTT)
The time taken for a packet to travel from sender to receiver and back.

### Packet Loss
Occurs when packets are dropped due to congestion, errors, or network failures.
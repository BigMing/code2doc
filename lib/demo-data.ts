/**
 * [优化] 首次使用示例数据
 * 帮助新用户快速了解产品能力
 */

export const DEMO_CODE_JAVA = `package com.example.order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;

    public OrderService(OrderRepository orderRepository,
                        InventoryService inventoryService,
                        PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.inventoryService = inventoryService;
        this.paymentService = paymentService;
    }

    public Order createOrder(Long userId, List<OrderItem> items, String couponCode) {
        if (userId == null || items == null || items.isEmpty()) {
            throw new IllegalArgumentException("用户ID和商品列表不能为空");
        }

        for (OrderItem item : items) {
            boolean available = inventoryService.checkStock(item.getProductId(), item.getQuantity());
            if (!available) {
                throw new OutOfStockException("商品库存不足: " + item.getProductId());
            }
        }

        BigDecimal totalAmount = calculateTotal(items);
        BigDecimal discount = applyCoupon(couponCode, totalAmount);
        BigDecimal finalAmount = totalAmount.subtract(discount);

        Order order = new Order();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setItems(items);
        order.setTotalAmount(totalAmount);
        order.setDiscount(discount);
        order.setPayAmount(finalAmount);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setCreateTime(LocalDateTime.now());

        orderRepository.save(order);
        inventoryService.deductStock(items);

        return order;
    }

    public void payOrder(String orderNo, String paymentMethod) {
        Order order = orderRepository.findByOrderNo(orderNo);
        if (order == null) {
            throw new OrderNotFoundException("订单不存在: " + orderNo);
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("订单状态不允许支付: " + order.getStatus());
        }

        boolean success = paymentService.processPayment(orderNo, order.getPayAmount(), paymentMethod);
        if (success) {
            order.setStatus(OrderStatus.PAID);
            order.setPayTime(LocalDateTime.now());
            orderRepository.update(order);
        } else {
            order.setStatus(OrderStatus.PAYMENT_FAILED);
            orderRepository.update(order);
            throw new PaymentException("支付处理失败");
        }
    }

    private BigDecimal calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(item -> item.getPrice().multiply(new BigDecimal(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal applyCoupon(String couponCode, BigDecimal totalAmount) {
        if (couponCode == null || couponCode.isEmpty()) {
            return BigDecimal.ZERO;
        }
        if ("SAVE10".equals(couponCode) && totalAmount.compareTo(new BigDecimal("100")) >= 0) {
            return totalAmount.multiply(new BigDecimal("0.1"));
        }
        return BigDecimal.ZERO;
    }

    private String generateOrderNo() {
        return "ORD" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }
}`;

export const DEMO_BUSINESS_CONTEXT = `电商订单核心服务，处理用户下单、库存扣减、优惠券计算和支付流程。`;
